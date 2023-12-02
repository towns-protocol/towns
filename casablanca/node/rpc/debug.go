package rpc

import (
	"fmt"
	"html"
	"net/http"
	"net/http/pprof"
	"runtime"
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

func registerDebugHandlers(mux httpMux) {
	handler := debugHandler{}
	mux.HandleFunc("/debug", handler.ServeHTTP)

	handler.Handle(mux, "/debug/memory", MemoryHandler())
	handler.HandleFunc(mux, "/debug/pprof/", pprof.Index)
	handler.HandleFunc(mux, "/debug/stacks", handleStacks)
}
