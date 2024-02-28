package rpc

import (
	"net/http"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/infra"

	"log/slog"
)

var (
	http2Requests = infra.NewCounter("http2_requests", "")
	http1Requests = infra.NewCounter("http1_requests", "")
)

const (
	RequestIdHeader = "X-River-Request-Id"
)

type httpHandler struct {
	base http.Handler
	log  *slog.Logger
}

var _ http.Handler = (*httpHandler)(nil)

func newHttpHandler(b http.Handler, l *slog.Logger) *httpHandler {
	return &httpHandler{
		base: b,
		log:  l,
	}
}

func (h *httpHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var id string
	ids, ok := r.Header[RequestIdHeader]
	if ok && len(ids) > 0 {
		id = ids[0]
	}

	// Limit request id to 16 char max
	if len(id) > 16 {
		id = id[:16]
	} else if id == "" {
		id = GenShortNanoid()
	}

	log := h.log.With("requestId", id)
	r = r.WithContext(dlog.CtxWithLog(r.Context(), log))

	if r.Proto == "HTTP/2.0" {
		http2Requests.Inc()
	} else {
		http1Requests.Inc()
		log.Debug("Non HTTP/2.0 request received", "method", r.Method, "path", r.URL.Path, "protocol", r.Proto)
	}

	w.Header().Add("X-Http-Version", r.Proto)
	w.Header().Add(RequestIdHeader, id)
	h.base.ServeHTTP(w, r)
}
