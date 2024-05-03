package rpc

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"slices"
	"strings"
	"sync"
	"time"

	"connectrpc.com/connect"
	"github.com/river-build/river/core/node/contracts"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/http_client"
	"github.com/river-build/river/core/node/nodes"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/protocol/protocolconnect"
	"github.com/river-build/river/core/node/rpc/render"
)

func tryPrettyFormatJson(js []byte) []byte {
	var data map[string]interface{}
	err := json.Unmarshal(js, &data)
	if err != nil {
		return js
	}

	pj, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return js
	}

	return pj
}

func getHttpStatus(ctx context.Context, record *render.DebugMultiNodeInfo, client *http.Client, wg *sync.WaitGroup) {
	log := dlog.FromCtx(ctx)
	defer wg.Done()

	log.Info("Fetching URL", "url", record.Url)

	start := time.Now()
	url := record.Url + "/status"
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		log.Error("Error creating request", "err", err, "url", url)
		record.HttpMsg = err.Error()
		return
	}
	resp, err := client.Do(req)
	elapsed := time.Since(start)
	if err != nil {
		log.Error("Error fetching URL", "err", err, "url", url)
		record.HttpMsg = err.Error()
		return
	}

	if resp != nil {
		defer resp.Body.Close()
		record.HttpSuccess = resp.StatusCode == 200
		record.HttpMsg = resp.Status + " " + elapsed.Round(time.Millisecond).String()
		if resp.StatusCode == 200 {
			statusJson, err := io.ReadAll(resp.Body)
			if err == nil {
				record.StatusJson = string(tryPrettyFormatJson(statusJson))
			} else {
				record.StatusJson = "Error reading response: " + err.Error()
			}
		}
	} else {
		record.HttpMsg = "No response"
	}
}

func getGrpcStatus(
	ctx context.Context,
	record *render.DebugMultiNodeInfo,
	client StreamServiceClient,
	wg *sync.WaitGroup,
) {
	log := dlog.FromCtx(ctx)
	defer wg.Done()

	start := time.Now()
	resp, err := client.Info(ctx, connect.NewRequest(&InfoRequest{}))
	elapsed := time.Since(start)
	if err != nil {
		log.Error("Error fetching Info", "err", err, "url", record.Url)
		record.GrpcMsg = err.Error()
		return
	}

	startTime := resp.Msg.StartTime.AsTime()
	record.GrpcSuccess = true
	record.GrpcMsg = elapsed.Round(time.Millisecond).String()
	record.Version = resp.Msg.Version
	record.Uptime = time.Since(startTime).
		Round(time.Second).
		String() +
		" (" + startTime.UTC().
		Format(time.RFC3339) +
		")"
	record.Graffiti = resp.Msg.Graffiti
}

// Initializes the template and returns a HTTP handler function
func (s *Service) handleDebugMulti(w http.ResponseWriter, r *http.Request) {
	ctx := s.serverCtx
	cfg := s.config
	log := dlog.FromCtx(ctx)
	log.Info("MultiHandler request")

	ctx, cancel := context.WithTimeout(ctx, cfg.Network.GetHttpRequestTimeout())
	defer cancel()

	allNodes := s.nodeRegistry.GetAllNodes()
	slices.SortFunc(allNodes, func(i, j *nodes.NodeRecord) int {
		return strings.Compare(i.Url(), j.Url())
	})

	client, err := http_client.GetHttpClient(ctx)
	if err != nil {
		log.Error("Error getting http client", "err", err)
	}
	client.Timeout = cfg.Network.GetHttpRequestTimeout()

	data := &render.DebugMultiData{
		CurrentTime: time.Now().UTC().Format(time.RFC3339),
	}
	wg := sync.WaitGroup{}
	for _, n := range allNodes {
		r := &render.DebugMultiNodeInfo{
			Url:      n.Url(),
			Local:    n.Local(),
			Address:  n.Address().Hex(),
			Status:   fmt.Sprintf("%d (%s)", n.Status(), contracts.NodeStatusString(n.Status())),
			Operator: n.Operator().Hex(),
		}
		data.Results = append(data.Results, r)

		wg.Add(2)
		go getHttpStatus(ctx, r, client, &wg)

		grpcClient := n.StreamServiceClient()
		if grpcClient == nil {
			grpcClient = NewStreamServiceClient(client, n.Url(), connect.WithGRPC())
		}
		go getGrpcStatus(ctx, r, grpcClient, &wg)
	}

	wg.Wait()

	err = render.ExecuteAndWrite(data, w)
	if err != nil {
		log.Error("Error rendering template for debug/multi", "err", err)
		http.Error(w, "Internal Server Error: "+err.Error(), http.StatusInternalServerError)
	}
	log.Info("MultiHandler done")
}
