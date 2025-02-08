package rpc

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptrace"
	"slices"
	"strings"
	"sync"
	"time"

	"connectrpc.com/connect"
	"connectrpc.com/otelconnect"
	"github.com/ethereum/go-ethereum/common"
	"go.opentelemetry.io/otel/trace"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/http_client"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/rpc/render"
	"github.com/towns-protocol/towns/core/node/rpc/statusinfo"
	"github.com/towns-protocol/towns/core/node/storage"
)

func formatDurationToMs(d time.Duration) string {
	return d.Round(time.Millisecond).String()
}

func formatDurationToSeconds(d time.Duration) string {
	d = d.Round(time.Second)
	day := 24 * time.Hour
	if d >= day {
		days := d / day
		remainder := d % day
		if remainder != 0 {
			return fmt.Sprintf("%dd%s", days, remainder.String())
		} else {
			return fmt.Sprintf("%dd", days)
		}
	} else {
		return d.String()
	}
}

func traceCtxForTimeline(
	ctx context.Context,
	start time.Time,
	timeline *statusinfo.Timeline,
	timelineMu *sync.Mutex,
	dnsAddrs *[]string,
	usedAddr *string,
) context.Context {
	return httptrace.WithClientTrace(ctx, &httptrace.ClientTrace{
		GotConn: func(connInfo httptrace.GotConnInfo) {
			timelineMu.Lock()
			defer timelineMu.Unlock()
			*usedAddr = connInfo.Conn.RemoteAddr().String()
			// TLSHandshakeDone is not called for HTTP/2 connections,
			// but GotConn is called right after.
			timeline.TLSHandshakeDone = formatDurationToMs(time.Since(start))
		},
		GotFirstResponseByte: func() {
			timelineMu.Lock()
			defer timelineMu.Unlock()
			timeline.GotFirstResponseByte = formatDurationToMs(time.Since(start))
		},
		DNSDone: func(dnsInfo httptrace.DNSDoneInfo) {
			timelineMu.Lock()
			defer timelineMu.Unlock()
			for _, addr := range dnsInfo.Addrs {
				*dnsAddrs = append(*dnsAddrs, addr.String())
			}
			timeline.DNSDone = formatDurationToMs(time.Since(start))
		},
		ConnectDone: func(network, addr string, err error) {
			timelineMu.Lock()
			defer timelineMu.Unlock()
			timeline.ConnectDone = formatDurationToMs(time.Since(start))
		},
		WroteRequest: func(wroteRequestInfo httptrace.WroteRequestInfo) {
			timelineMu.Lock()
			defer timelineMu.Unlock()
			timeline.WroteRequest = formatDurationToMs(time.Since(start))
		},
	})
}

func getHttpStatus(
	ctx context.Context,
	baseUrl string,
	suffix string,
	result *statusinfo.HttpResult,
	client *http.Client,
	wg *sync.WaitGroup,
) {
	log := logging.FromCtx(ctx)
	defer wg.Done()

	start := time.Now()
	dnsAddrs := []string{}
	var usedAddr string
	var timeline statusinfo.Timeline
	var timelineMu sync.Mutex
	url := baseUrl + "/status" + suffix
	req, err := http.NewRequestWithContext(
		traceCtxForTimeline(ctx, start, &timeline, &timelineMu, &dnsAddrs, &usedAddr),
		"GET", url, nil)
	req.Header.Set("Accept", "application/json")
	if err != nil {
		log.Errorw("Error creating request", "err", err, "url", url)
		result.StatusText = err.Error()
		return
	}
	resp, err := client.Do(req)
	if err == nil {
		if resp != nil {
			defer resp.Body.Close()
			result.Success = resp.StatusCode == 200
			result.Status = resp.StatusCode
			result.StatusText = resp.Status
			result.Protocol = resp.Proto
			result.UsedTLS = resp.TLS != nil

			// Always try to read the response body, even if the status code is not 200.
			statusJson, err := io.ReadAll(resp.Body)
			if err == nil && len(statusJson) > 0 {
				st, err := statusinfo.StatusResponseFromJson(statusJson)
				if err == nil {
					result.Response = st
				} else {
					result.Response.Status = "Error decoding response: " + err.Error()
				}
			}
		} else {
			result.StatusText = "No response"
		}
	} else {
		log.Errorw("Error fetching URL", "err", err, "url", url)
		result.StatusText = err.Error()
	}

	timelineMu.Lock()
	defer timelineMu.Unlock()
	timeline.Total = formatDurationToMs(time.Since(start))
	result.DNSAddresses = dnsAddrs
	result.RemoteAddress = usedAddr
	result.Elapsed = timeline.Total
	result.Timeline = timeline
}

func getGrpcStatus(
	ctx context.Context,
	record *statusinfo.NodeStatus,
	client StreamServiceClient,
	wg *sync.WaitGroup,
) {
	log := logging.FromCtx(ctx)
	defer wg.Done()

	start := time.Now()
	dnsAddrs := []string{}
	var usedAddr string
	var timeline statusinfo.Timeline
	var timelineMu sync.Mutex
	req := connect.NewRequest(&InfoRequest{})
	resp, err := client.Info(
		traceCtxForTimeline(ctx, start, &timeline, &timelineMu, &dnsAddrs, &usedAddr),
		req)

	timelineMu.Lock()
	defer timelineMu.Unlock()
	timeline.Total = formatDurationToMs(time.Since(start))
	record.Grpc.DNSAddresses = dnsAddrs
	record.Grpc.RemoteAddress = usedAddr
	record.Grpc.Elapsed = timeline.Total
	record.Grpc.Timeline = timeline

	if err != nil {
		log.Errorw("Error fetching Info", "err", err, "url", record.Record.Url)
		record.Grpc.StatusText = err.Error()
		return
	}

	startTime := resp.Msg.StartTime.AsTime()

	record.Grpc.Success = true
	record.Grpc.StatusText = "OK"
	record.Grpc.Version = resp.Msg.Version
	record.Grpc.StartTime = startTime.UTC().Format(time.RFC3339)
	record.Grpc.Uptime = formatDurationToSeconds(time.Since(startTime))
	record.Grpc.Graffiti = resp.Msg.Graffiti
	record.Grpc.Protocol = req.Peer().Protocol
	record.Grpc.XHttpVersion = resp.Header().Get("X-HTTP-Version")
}

func getEthBalance(
	ctx context.Context,
	result *string,
	blockchain *crypto.Blockchain,
	address common.Address,
	wg *sync.WaitGroup,
) {
	defer wg.Done()

	balance, err := blockchain.Client.BalanceAt(ctx, address, nil)
	if err != nil {
		*result = "Error getting balance: " + err.Error()
		return
	}

	b := balance.String()
	dot := len(b) - 18
	if dot > 0 {
		*result = b[:dot] + "." + b[dot:]
	} else {
		*result = "0." + strings.Repeat("0", -dot) + b
	}
}

func getPgxPoolStatus(
	ctx context.Context,
	result *storage.PostgresStatusResult,
	poolInfo *storage.PgxPoolInfo,
	wg *sync.WaitGroup,
) {
	defer wg.Done()

	*result = storage.PreparePostgresStatus(ctx, *poolInfo)
}

func GetRiverNetworkStatus(
	ctx context.Context,
	cfg *config.Config,
	nodeRegistry nodes.NodeRegistry,
	riverChain *crypto.Blockchain,
	baseChain *crypto.Blockchain,
	connectOtelIterceptor *otelconnect.Interceptor,
	storagePoolInfo *storage.PgxPoolInfo,
) (*statusinfo.RiverStatus, error) {
	startTime := time.Now()

	ctx, cancel := context.WithTimeout(ctx, cfg.Network.GetHttpRequestTimeout())
	defer cancel()

	allNodes := nodeRegistry.GetAllNodes()
	slices.SortFunc(allNodes, func(i, j *nodes.NodeRecord) int {
		return strings.Compare(i.Url(), j.Url())
	})

	http11client, err := http_client.GetHttp11Client(ctx)
	if err != nil {
		return nil, err
	}
	http11client.Timeout = cfg.Network.GetHttpRequestTimeout()

	http20client, err := http_client.GetHttpClient(ctx, cfg)
	if err != nil {
		return nil, err
	}
	defer http20client.CloseIdleConnections()
	http20client.Timeout = cfg.Network.GetHttpRequestTimeout()

	grpcHttpClient, err := http_client.GetHttpClient(ctx, cfg)
	if err != nil {
		return nil, err
	}
	defer grpcHttpClient.CloseIdleConnections()
	grpcHttpClient.Timeout = cfg.Network.GetHttpRequestTimeout()

	data := &statusinfo.RiverStatus{
		QueryTime: time.Now().UTC().Format(time.RFC3339),
	}
	wg := sync.WaitGroup{}
	for _, n := range allNodes {
		r := &statusinfo.NodeStatus{
			Record: statusinfo.RegistryNodeInfo{
				Address:    n.Address().Hex(),
				Url:        n.Url(),
				Operator:   n.Operator().Hex(),
				Status:     int(n.Status()),
				StatusText: river.NodeStatusString(n.Status()),
			},
			Local: n.Local(),
		}
		data.Nodes = append(data.Nodes, r)

		connectOpts := []connect.ClientOption{connect.WithGRPC()}
		if connectOtelIterceptor != nil {
			connectOpts = append(connectOpts, connect.WithInterceptors(connectOtelIterceptor))
		} else {
			logging.FromCtx(ctx).Errorw("No OpenTelemetry interceptor for gRPC client")
		}

		wg.Add(4)
		go getHttpStatus(ctx, n.Url(), "?blockchain=1", &r.Http11, http11client, &wg)
		go getHttpStatus(ctx, n.Url(), "?blockchain=0", &r.Http20, http20client, &wg)
		go getGrpcStatus(ctx, r, NewStreamServiceClient(grpcHttpClient, n.Url(), connectOpts...), &wg)
		go getEthBalance(ctx, &r.RiverEthBalance, riverChain, n.Address(), &wg)
		if baseChain != nil {
			wg.Add(1)
			go getEthBalance(ctx, &r.BaseEthBalance, baseChain, n.Address(), &wg)
		}

		// Report PostgresStatusResult for local node only iff storage debug endpoint is enabled
		if n.Address() == riverChain.Wallet.Address &&
			storagePoolInfo != nil &&
			cfg.EnableDebugEndpoints &&
			cfg.DebugEndpoints.EnableStorageEndpoint {
			wg.Add(1)

			r.PostgresStatus = &storage.PostgresStatusResult{}
			go getPgxPoolStatus(ctx, r.PostgresStatus, storagePoolInfo, &wg)
		}
	}

	wg.Wait()

	data.Elapsed = formatDurationToMs(time.Since(startTime))
	return data, nil
}

func (s *Service) handleDebugStorage(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := s.defaultLogger

	wg := sync.WaitGroup{}
	wg.Add(1)
	status := &storage.PostgresStatusResult{}

	go getPgxPoolStatus(ctx, status, s.storagePoolInfo, &wg)

	wg.Wait()

	err := render.ExecuteAndWrite(&render.StorageData{Status: status}, w)
	if !s.config.Log.Simplify {
		log.Infow("Node storage status", "data", status)
	}
	if err != nil {
		log.Errorw("Error getting data or rendering template for debug/storage", "err", err)
		http.Error(w, "Internal Server Error: "+err.Error(), http.StatusInternalServerError)
	}
}

func (s *Service) handleDebugMulti(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if s.otelTracer != nil {
		var span trace.Span
		ctx, span = s.otelTracer.Start(r.Context(), "handleDebugMulti")
		defer span.End()
	}

	log := s.defaultLogger

	status, err := GetRiverNetworkStatus(
		ctx,
		s.config,
		s.nodeRegistry,
		s.riverChain,
		s.baseChain,
		s.otelConnectIterceptor,
		s.storagePoolInfo,
	)
	if err == nil {
		err = render.ExecuteAndWrite(&render.DebugMultiData{Status: status}, w)
		if !s.config.Log.Simplify {
			log.Infow("River Network Status", "data", status)
		}
	}
	if err != nil {
		log.Errorw("Error getting data or rendering template for debug/multi", "err", err)
		http.Error(w, "Internal Server Error: "+err.Error(), http.StatusInternalServerError)
	}
}

func (s *Service) handleDebugMultiJson(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if s.otelTracer != nil {
		var span trace.Span
		ctx, span = s.otelTracer.Start(r.Context(), "handleDebugMulti")
		defer span.End()
	}

	log := s.defaultLogger

	w.Header().Set("Content-Type", "application/json")
	status, err := GetRiverNetworkStatus(
		ctx,
		s.config,
		s.nodeRegistry,
		s.riverChain,
		s.baseChain,
		s.otelConnectIterceptor,
		s.storagePoolInfo,
	)
	if err == nil {
		// Write status as json
		err = json.NewEncoder(w).Encode(status)
		if !s.config.Log.Simplify {
			log.Infow("River Network Status", "data", status)
		}
	}
	if err != nil {
		log.Errorw("Error getting data or writing json for debug/multi/json", "err", err)
		http.Error(w, "Internal Server Error: "+err.Error(), http.StatusInternalServerError)
	}
}
