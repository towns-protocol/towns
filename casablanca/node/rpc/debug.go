package rpc

import (
	. "casablanca/node/events"
	"fmt"
	"html"
	"net/http"
	"net/http/pprof"
	"runtime"
	"sort"
	"strings"
)

// GenerateStackHTML generates an HTML table from runtime.Stack
func generateStackHTML() string {
	buf := make([]byte, 1024*1024)
	stackSize := runtime.Stack(buf, true)
	stacks := string(buf[:stackSize])

	// Escape HTML-specific characters for safety
	stacks = html.EscapeString(stacks)

	lines := strings.Split(stacks, "\n")
	var sb strings.Builder
	sb.WriteString("<table border='1'>")
	sb.WriteString("<tr><th>Goroutine</th><th>Stack</th></tr>")
	var goroutine, stack string
	for _, line := range lines {
		if strings.HasPrefix(line, "goroutine ") {
			if goroutine != "" {
				sb.WriteString(fmt.Sprintf("<tr><td>%s</td><td><pre>%s</pre></td></tr>", goroutine, stack))
			}
			goroutine = line
			stack = ""
		} else if strings.HasPrefix(line, "\t") || line == "" {
			stack += line + "\n"
		} else {
			stack += "\t" + line + "\n"
		}
	}
	if goroutine != "" {
		sb.WriteString(fmt.Sprintf("<tr><td>%s</td><td><pre>%s</pre></td></tr>", goroutine, stack))
	}
	sb.WriteString("</table>")
	return sb.String()
}

func handleStacks(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(generateStackHTML()))
}

type cacheHandler struct {
	cache StreamCache
}

func safeDivStr(a, b int) string {
	if b == 0 {
		return "NA"
	}
	return fmt.Sprintf("%.2f", float64(a)/float64(b))
}

func (h *cacheHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusOK)

	printStreams := r.URL.Query().Get("streams") == "1"

	streams := h.cache.ListStreams(ctx)
	sort.Strings(streams)

	var miniblocks, eventsInMiniblocks, snapshotsInMiniblocks, eventsInMinipools, trimmedStreams, totalEventsEver int

	var streamTable strings.Builder
	for i, stream := range streams {
		_, view, err := h.cache.GetStream(ctx, stream)
		if err != nil {
			continue
		}

		stats := view.GetStats()
		miniblocks += int(stats.LastMiniblockNum - stats.FirstMiniblockNum + 1)
		eventsInMiniblocks += stats.EventsInMiniblocks
		snapshotsInMiniblocks += stats.SnapshotsInMiniblocks
		eventsInMinipools += stats.EventsInMinipool
		if stats.FirstMiniblockNum != 0 {
			trimmedStreams++
		}
		totalEventsEver += stats.TotalEventsEver

		if printStreams && i < 10000 {
			fmt.Fprintf(
				&streamTable,
				"<tr><td>%d</td><td>%s</td><td>%d</td><td>%d</td><td>%d</td><td>%d</td><td>%d</td><td>%d</td><td>%d</td></tr>",
				i,
				stream,
				stats.FirstMiniblockNum,
				stats.LastMiniblockNum,
				stats.LastMiniblockNum-stats.FirstMiniblockNum+1,
				stats.EventsInMiniblocks,
				stats.SnapshotsInMiniblocks,
				stats.EventsInMinipool,
				stats.TotalEventsEver,
			)
		}
	}

	numStreams := len(streams)
	_, _ = w.Write([]byte("<html><body>"))
	fmt.Fprintf(w, "<h3>Stream cache</h3>")
	fmt.Fprintf(w, "<p>Streams: %d</p>", numStreams)
	fmt.Fprintf(w, "<p>Miniblocks: %d, %s per stream</p>", miniblocks, safeDivStr(miniblocks, numStreams))
	fmt.Fprintf(
		w,
		"<p>Events in miniblocks: %d, %s per stream, %s per miniblock</p>",
		eventsInMiniblocks,
		safeDivStr(eventsInMiniblocks, numStreams),
		safeDivStr(eventsInMiniblocks, miniblocks),
	)
	fmt.Fprintf(
		w,
		"<p>Snapshots in miniblocks: %d, %s per stream, %s per miniblock</p>",
		snapshotsInMiniblocks,
		safeDivStr(snapshotsInMiniblocks, numStreams),
		safeDivStr(snapshotsInMiniblocks, miniblocks),
	)
	fmt.Fprintf(
		w,
		"<p>Events in minipools: %d, %s per stream</p>",
		eventsInMinipools,
		safeDivStr(eventsInMinipools, numStreams),
	)
	fmt.Fprintf(
		w,
		"<p>Trimmed streams: %d, %s per stream</p>",
		trimmedStreams,
		safeDivStr(trimmedStreams, numStreams),
	)
	fmt.Fprintf(
		w,
		"<p>Total events ever: %d, %s per stream</p>",
		totalEventsEver,
		safeDivStr(totalEventsEver, numStreams),
	)

	if !printStreams {
		fmt.Fprintf(w, "<p><a href=\"cache?streams=1\">Print streams</a></p>")
	} else {
		fmt.Fprintf(w, "<p><a href=\"cache\">Hide streams</a></p>")
		fmt.Fprintf(w, "<pre><table border=\"1\">")
		fmt.Fprintf(w, "<tr><th>#</th><th>Stream</th><th>First MB</th><th>Last MB</th><th>Miniblocks</th>"+
			"<th>Events in MB</th><th>Snapshots</th><th>Events in MP</th><th>Events Ever</th></tr>")
		_, _ = w.Write([]byte(streamTable.String()))
		fmt.Fprintf(w, "</table></pre>")
	}

	_, _ = w.Write([]byte("</body></html>"))
}

type debugHandler struct {
	patterns []string
}

func (h *debugHandler) HandleFunc(mux httpMux, pattern string, handler func(http.ResponseWriter, *http.Request)) {
	h.patterns = append(h.patterns, pattern)
	mux.HandleFunc(pattern, handler)
}

func (h *debugHandler) Handle(mux httpMux, pattern string, handler http.Handler) {
	h.patterns = append(h.patterns, pattern)
	mux.Handle(pattern, handler)
}

func (h *debugHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "<html><body>")
	fmt.Fprintln(w, "<h3>Available debug handlers:</h3>")
	fmt.Fprintln(w, "<ul>")
	for _, pattern := range h.patterns {
		fmt.Fprintf(w, "<li><a href=\"%s\">%s</a></li>", pattern, pattern)
	}
	fmt.Fprintf(w, "<li><a href=\"/debug/pprof/heap?debug=1&gc=1\">/debug/pprof/heap with GC</a></li>")
	fmt.Fprintln(w, "</ul>")
	fmt.Fprintln(w, "</body></html>")
}

type httpMux interface {
	HandleFunc(pattern string, handler func(http.ResponseWriter, *http.Request))
	Handle(pattern string, handler http.Handler)
}

func registerDebugHandlers(mux httpMux, cache StreamCache) {
	handler := debugHandler{}
	mux.HandleFunc("/debug", handler.ServeHTTP)

	handler.Handle(mux, "/debug/cache", &cacheHandler{cache: cache})
	handler.Handle(mux, "/debug/memory", MemoryHandler())
	handler.HandleFunc(mux, "/debug/pprof/", pprof.Index)
	mux.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline)
	mux.HandleFunc("/debug/pprof/profile", pprof.Profile)
	mux.HandleFunc("/debug/pprof/symbol", pprof.Symbol)
	mux.HandleFunc("/debug/pprof/trace", pprof.Trace)
	handler.HandleFunc(mux, "/debug/stacks", handleStacks)
}
