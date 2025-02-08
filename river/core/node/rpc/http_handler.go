package rpc

import (
	"net/http"

	"go.uber.org/zap"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
)

const (
	RequestIdHeader = "X-River-Request-Id"
)

type httpHandler struct {
	base http.Handler
	log  *zap.SugaredLogger
}

var _ http.Handler = (*httpHandler)(nil)

func newHttpHandler(b http.Handler, l *zap.SugaredLogger) *httpHandler {
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
	r = r.WithContext(logging.CtxWithLog(r.Context(), log))

	if r.Proto != "HTTP/2.0" {
		log.Debugw("Non HTTP/2.0 request received", "method", r.Method, "path", r.URL.Path, "protocol", r.Proto)
	}

	w.Header().Add("X-Http-Version", r.Proto)
	w.Header().Add(RequestIdHeader, id)

	h.base.ServeHTTP(w, r)
}
