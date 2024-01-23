package rpc

import (
	"context"
	"fmt"
	"html/template"
	"net/http"
	"sync"
	"time"

	"github.com/river-build/river/dlog"
	"golang.org/x/net/http2"
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
func MultiHandler(ctx context.Context, streamService *Service) http.HandlerFunc {
	log := dlog.CtxLog(ctx)

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
				Protocols: []string{"HTTP/1", "HTTP/2"},
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

			numNode := streamService.nodeRegistry.NumNodes()
			for i := 0; i < numNode; i++ {

				// HTTP/1 Client
				httpClient1 := &http.Client{}

				// HTTP/2 Client
				http2Transport := &http2.Transport{}
				httpClient2 := &http.Client{Transport: http2Transport}
				node, err := streamService.nodeRegistry.GetNodeRecordByIndex(i)
				if err != nil {
					log.Error("Error fetching node record", "err", err)
					http.Error(w, "Internal Server Error", http.StatusInternalServerError)
					continue
				}

				// Construct URL
				url := fmt.Sprintf("%s/info", node.Url())

				wg.Add(2)

				data.Nodes = append(data.Nodes, node.Url())

				// Initiate both requests in parallel
				go makeRequest(httpClient1, url, "HTTP/1", node.Url())
				go makeRequest(httpClient2, url, "HTTP/2", node.Url())

			}
			wg.Wait()

			log.Debug("data", "data", data)
			err := tmpl.Execute(w, data) // Use the pre-parsed template
			if err != nil {
				log.Error("Error executing template", "err", err)
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			}
			log.Info("MultiHandler done")
		}
	}
}
