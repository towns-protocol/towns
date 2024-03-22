package rpc

import (
	"context"
	"html/template"
	"net/http"
	"sync"
	"time"

	"connectrpc.com/connect"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/http_client"
	"github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/protocol/protocolconnect"
)

const multiHtmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Protocol and Node Responses</title>
    <style>
        .success { color: green; }
        .error { color: red; }
        table, th, td { border: 1px solid black; border-collapse: collapse; }
        th, td { padding: 5px; text-align: center; }
    </style>
</head>
<body>
    <h2>Node Response Times</h2>
    <table>
        <!-- Header row for Nodes -->
        <tr>
            <th>Protocol</th>
            {{ range .Nodes }}
            <th>{{ . }}</th>
            {{ end }}
        </tr>

        <!-- Data rows for each Protocol -->
        {{ range $protocol := .Protocols }}
        <tr>
            <td>{{ $protocol }}</td>
            {{ range $node := $.Nodes }}
            {{ $response := index $.Results $node }}
            {{ $found := false }}
            {{ range $response }}
                {{ if eq .Protocol $protocol }}
                    {{ if or .Failed (ne .StatusCode 200) }}
                    <td class="error">{{ .ResponseTime }} ({{ .StatusCode }})</td>
                    {{ else }}
                    <td class="success">{{ .ResponseTime }} ({{ .StatusCode }})</td>
                    {{ end }}
                    {{ $found = true }}
                {{ end }}
            {{ end }}
            {{ if not $found }}
            <td>N/A</td>
            {{ end }}
            {{ end }}
        </tr>
        {{ end }}
    </table>
</body>
</html>
`

type HTTPResponseInfo struct {
	Protocol     string
	ResponseTime time.Duration
	StatusCode   int
	Failed       bool
}

// Initializes the template and returns a HTTP handler function
func MultiHandler(ctx context.Context, cfg *config.Config, streamService *Service) http.HandlerFunc {
	log := dlog.FromCtx(ctx)

	tmpl, err := template.New("multistats").Parse(multiHtmlTemplate)

	log.Info("MultiHandler setup")
	if err != nil {
		// Return a simple handler that always responds with a 500 error
		return func(w http.ResponseWriter, r *http.Request) {
			log.Error("Error parsing template", "err", err)
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		}
	} else {
		return func(w http.ResponseWriter, r *http.Request) {
			data := struct {
				Results   map[string][]HTTPResponseInfo
				Nodes     []string
				Protocols []string
			}{
				Results:   make(map[string][]HTTPResponseInfo),
				Nodes:     []string{},
				Protocols: []string{"HTTP", "GRPC"},
			}

			var mutex = &sync.Mutex{}
			var wg = sync.WaitGroup{}
			log.Info("MultiHandler request")

			makeRequest := func(client *http.Client, url string, protocol string, node string) {
				defer wg.Done()

				start := time.Now()
				resp, err := client.Get(url)
				elapsed := time.Since(start)

				responseInfo := HTTPResponseInfo{
					Protocol:     protocol,
					ResponseTime: elapsed,
				}

				if err != nil {
					responseInfo.StatusCode = 0
					responseInfo.Failed = true
					log.Error("Error fetching URL", "url", url, "err", err, "protocol", protocol, "responseInfo", responseInfo)
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

				responseInfo := HTTPResponseInfo{
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

			log.Debug("data", "data", data)
			err = tmpl.Execute(w, data) // Use the pre-parsed template
			if err != nil {
				// Template execution failures are low value and typically due to closed tabs, so omit logging.
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			}
			log.Info("MultiHandler done")
		}
	}
}
