package rpc

import (
	. "casablanca/node/base"
	"casablanca/node/dlog"
	"casablanca/node/protocol"
	"context"

	connect_go "github.com/bufbuild/connect-go"
	"github.com/ethereum/go-ethereum/common"
	"golang.org/x/exp/slog"
)

func requestIdFromRequest[T any](req *connect_go.Request[T]) string {
	r := req.Header().Get("river-request-id")
	// Limit request id to 16 char max
	if len(r) > 16 {
		r = r[:16]
	} else if r == "" {
		r = GenShortNanoid()
	}
	return r
}

type RequestWithStreamId interface {
	GetStreamId() string
}

func ctxAndLogForRequest[T any](ctx context.Context, req *connect_go.Request[T]) (context.Context, *slog.Logger) {
	requestId := requestIdFromRequest(req)

	// Get logger from context and extend with request id
	log := dlog.CtxLog(ctx).With("request_id", requestId)

	if reqMsg, ok := any(req.Msg).(RequestWithStreamId); ok {
		streamId := reqMsg.GetStreamId()
		if streamId != "" {
			log = log.With("stream_id", streamId)
		}
	}

	// Create new context with logger
	ctx = dlog.CtxWithLog(ctx, log)
	return ctx, log
}

func ParseEthereumAddress(address string) (common.Address, error) {
	if len(address) != 42 {
		return common.Address{}, RiverError(protocol.Err_BAD_ADDRESS, "invalid address length")
	}
	if address[:2] != "0x" {
		return common.Address{}, RiverError(protocol.Err_BAD_ADDRESS, "invalid address prefix")
	}
	return common.HexToAddress(address), nil
}
