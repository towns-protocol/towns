package rpc

import (
	"context"
	"net/http"
	"slices"
	"sync"
	"time"

	"connectrpc.com/connect"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/http_client"
	"github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/protocol/protocolconnect"
	"github.com/river-build/river/core/node/rpc/render"
)

// Initializes the template and returns a HTTP handler function
func MultiHandler(ctx context.Context, cfg *config.Config, streamService *Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log := dlog.FromCtx(ctx)

		data := &render.DebugMultiData{
			Results:   make(map[string][]render.DebugMultiInfo),
			Nodes:     []string{},
			Protocols: []string{"HTTP", "GRPC"},
		}

		mutex := &sync.Mutex{}
		wg := sync.WaitGroup{}
		log.Info("MultiHandler request")

		makeRequest := func(client *http.Client, url string, protocol string, node string) {
			defer wg.Done()

			start := time.Now()
			resp, err := client.Get(url)
			elapsed := time.Since(start)

			responseInfo := render.DebugMultiInfo{
				Protocol:     protocol,
				ResponseTime: elapsed,
			}

			if err != nil {
				responseInfo.StatusCode = 0
				responseInfo.Failed = true
				log.Error(
					"Error fetching URL",
					"url",
					url,
					"err",
					err,
					"protocol",
					protocol,
					"responseInfo",
					responseInfo,
				)
			} else {
				defer resp.Body.Close()
				responseInfo.StatusCode = resp.StatusCode
				responseInfo.Failed = false
			}

			mutex.Lock()
			data.Results[node] = append(data.Results[node], responseInfo)
			mutex.Unlock()
		}

		makeInfoRequest := func(s protocolconnect.StreamServiceClient, node string) {
			defer wg.Done()

			start := time.Now()

			status := 200

			resp, err := s.Info(ctx, connect.NewRequest(&protocol.InfoRequest{}))
			if err != nil {
				log.Error("Error fetching info", "err", err)
				status = 500

			}

			if (resp == nil) || (resp.Msg == nil) {
				log.Error("Error fetching info", "err", "resp or resp.Msg is nil")
				status = 500
			}

			elapsed := time.Since(start)

			responseInfo := render.DebugMultiInfo{
				Protocol:     "GRPC",
				ResponseTime: elapsed,
				StatusCode:   status,
			}

			mutex.Lock()
			data.Results[node] = append(data.Results[node], responseInfo)
			mutex.Unlock()
		}

		client, err := http_client.GetHttpClient(ctx)
		if err != nil {
			log.Error("Error getting http client", "err", err)
		}

		nodes := streamService.nodeRegistry.GetAllNodes()
		for _, node := range nodes {
			if !node.Local() {
				wg.Add(2)

				data.Nodes = append(data.Nodes, node.Url())

				// Initiate both requests in parallel
				go makeRequest(client, node.Url()+"/info", "HTTP", node.Url())
				go makeInfoRequest(node.StreamServiceClient(), node.Url())
			}
		}
		wg.Wait()

		slices.Sort(data.Nodes)

		log.Debug("data", "data", data)
		err = render.ExecuteAndWrite(data, w)
		if err != nil {
			// Template execution failures are low value and typically due to closed tabs, so omit logging.
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		}
		log.Info("MultiHandler done")
	}
}
