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
	"github.com/ethereum/go-ethereum/common"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/contracts"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/http_client"
	"github.com/river-build/river/core/node/nodes"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/protocol/protocolconnect"
	"github.com/river-build/river/core/node/rpc/render"
	"github.com/river-build/river/core/node/rpc/statusinfo"
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

func getHttpStatus(
	ctx context.Context,
	baseUrl string,
	result *statusinfo.HttpResult,
	client *http.Client,
	wg *sync.WaitGroup,
) {
	log := dlog.FromCtx(ctx)
	defer wg.Done()

	start := time.Now()
	dnsResolved := start
	connectionEstablished := start
	dnsAddrs := []string{}
	var usedAddr string
	traceCtx := httptrace.WithClientTrace(ctx, &httptrace.ClientTrace{
		DNSDone: func(dnsInfo httptrace.DNSDoneInfo) {
			for _, addr := range dnsInfo.Addrs {
				dnsAddrs = append(dnsAddrs, addr.String())
			}
			dnsResolved = time.Now()
		},
		GotConn: func(connInfo httptrace.GotConnInfo) {
			usedAddr = connInfo.Conn.RemoteAddr().String()
			connectionEstablished = time.Now()
		},
	})

	url := baseUrl + "/status?blockchain=1"
	req, err := http.NewRequestWithContext(traceCtx, "GET", url, nil)
	req.Header.Set("Accept", "application/json")
	if err != nil {
		log.Error("Error creating request", "err", err, "url", url)
		result.StatusText = err.Error()
		return
	}
	resp, err := client.Do(req)
	end := time.Now()
	result.DNSAddresses = dnsAddrs
	result.RemoteAddress = usedAddr
	if err != nil {
		log.Error("Error fetching URL", "err", err, "url", url)
		result.StatusText = err.Error()
		return
	}

	if resp != nil {
		defer resp.Body.Close()
		result.Success = resp.StatusCode == 200
		result.Status = resp.StatusCode
		result.StatusText = resp.Status
		result.Elapsed = formatDurationToMs(end.Sub(start))
		result.ElapsedAfterDNS = formatDurationToMs(end.Sub(dnsResolved))
		result.ElapsedAfterConn = formatDurationToMs(end.Sub(connectionEstablished))
		result.Protocol = resp.Proto
		result.UsedTLS = resp.TLS != nil
		if resp.StatusCode == 200 {
			statusJson, err := io.ReadAll(resp.Body)
			if err == nil {
				st, err := statusinfo.StatusResponseFromJson(statusJson)
				if err == nil {
					result.Response = st
				} else {
					result.Response.Status = "Error decoding response: " + err.Error()
				}
			} else {
				result.Response.Status = "Error reading response: " + err.Error()
			}
		}
	} else {
		result.StatusText = "No response"
	}
}

func getGrpcStatus(
	ctx context.Context,
	record *statusinfo.NodeStatus,
	client StreamServiceClient,
	wg *sync.WaitGroup,
) {
	log := dlog.FromCtx(ctx)
	defer wg.Done()

	start := time.Now()
	dnsResolved := start
	connectionEstablished := start
	dnsAddrs := []string{}
	var usedAddr string
	traceCtx := httptrace.WithClientTrace(ctx, &httptrace.ClientTrace{
		DNSDone: func(dnsInfo httptrace.DNSDoneInfo) {
			for _, addr := range dnsInfo.Addrs {
				dnsAddrs = append(dnsAddrs, addr.String())
			}
			dnsResolved = time.Now()
		},
		GotConn: func(connInfo httptrace.GotConnInfo) {
			usedAddr = connInfo.Conn.RemoteAddr().String()
			connectionEstablished = time.Now()
		},
	})

	req := connect.NewRequest(&InfoRequest{})
	resp, err := client.Info(traceCtx, req)
	end := time.Now()
	record.Grpc.DNSAddresses = dnsAddrs
	record.Grpc.RemoteAddress = usedAddr
	if err != nil {
		log.Error("Error fetching Info", "err", err, "url", record.Record.Url)
		record.Grpc.StatusText = err.Error()
		return
	}

	startTime := resp.Msg.StartTime.AsTime()

	record.Grpc.Success = true
	record.Grpc.StatusText = "OK"
	record.Grpc.Elapsed = formatDurationToMs(end.Sub(start))
	record.Grpc.ElapsedAfterDNS = formatDurationToMs(end.Sub(dnsResolved))
	record.Grpc.ElapsedAfterConn = formatDurationToMs(end.Sub(connectionEstablished))
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
	riverChain *crypto.Blockchain,
	address common.Address,
	wg *sync.WaitGroup,
) {
	defer wg.Done()

	balance, err := riverChain.Client.BalanceAt(ctx, address, nil)
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

func GetRiverNetworkStatus(
	ctx context.Context,
	cfg *config.Config,
	nodeRegistry nodes.NodeRegistry,
	riverChain *crypto.Blockchain,
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

	http20client, err := http_client.GetHttpClient(ctx)
	if err != nil {
		return nil, err
	}
	http20client.Timeout = cfg.Network.GetHttpRequestTimeout()

	grpcHttpClient, err := http_client.GetHttpClient(ctx)
	if err != nil {
		return nil, err
	}
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
				StatusText: contracts.NodeStatusString(n.Status()),
			},
			Local: n.Local(),
		}
		data.Nodes = append(data.Nodes, r)

		wg.Add(4)
		go getHttpStatus(ctx, n.Url(), &r.Http11, http11client, &wg)
		go getHttpStatus(ctx, n.Url(), &r.Http20, http20client, &wg)
		go getGrpcStatus(ctx, r, NewStreamServiceClient(grpcHttpClient, n.Url(), connect.WithGRPC()), &wg)
		go getEthBalance(ctx, &r.RiverEthBalance, riverChain, n.Address(), &wg)
	}

	wg.Wait()
	data.Elapsed = formatDurationToMs(time.Since(startTime))
	return data, nil
}

func (s *Service) handleDebugMulti(w http.ResponseWriter, r *http.Request) {
	log := s.defaultLogger

	status, err := GetRiverNetworkStatus(r.Context(), s.config, s.nodeRegistry, s.riverChain)
	if err == nil {
		err = render.ExecuteAndWrite(&render.DebugMultiData{Status: status}, w)
		log.Info("River Network Status", "data", status)
	}
	if err != nil {
		log.Error("Error getting data or rendering template for debug/multi", "err", err)
		http.Error(w, "Internal Server Error: "+err.Error(), http.StatusInternalServerError)
	}
}

func (s *Service) handleDebugMultiJson(w http.ResponseWriter, r *http.Request) {
	log := s.defaultLogger

	w.Header().Set("Content-Type", "application/json")
	status, err := GetRiverNetworkStatus(r.Context(), s.config, s.nodeRegistry, s.riverChain)
	if err == nil {
		// Write status as json
		err = json.NewEncoder(w).Encode(status)
		log.Info("River Network Status", "data", status)
	}
	if err != nil {
		log.Error("Error getting data or writing json for debug/multi/json", "err", err)
		http.Error(w, "Internal Server Error: "+err.Error(), http.StatusInternalServerError)
	}
}
