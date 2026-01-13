package rpc

import (
	"net/http"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/rpc/headers"
)

const (
	RequestIdHeader = "X-River-Request-Id"
)

type httpHandler struct {
	base http.Handler
	log  *logging.Log
}

var _ http.Handler = (*httpHandler)(nil)

func newHttpHandler(b http.Handler, l *logging.Log) *httpHandler {
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

	// Add client version to log context if present
	if version := r.Header.Get(headers.RiverClientVersionHeader); version != "" {
		log = log.With("clientVersion", version)
	}

	r = r.WithContext(logging.CtxWithLog(r.Context(), log))

	if r.Proto != "HTTP/2.0" {
		log.Debugw("Non HTTP/2.0 request received", "method", r.Method, "path", r.URL.Path, "protocol", r.Proto)
	}

	w.Header().Add("X-Http-Version", r.Proto)
	w.Header().Add(RequestIdHeader, id)

	h.base.ServeHTTP(w, r)
}
