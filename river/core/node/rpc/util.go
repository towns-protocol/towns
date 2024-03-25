package rpc

import (
	"context"
	"log/slog"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/protocol"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
)

type RequestWithStreamId interface {
	GetStreamId() string
}

func ctxAndLogForRequest[T any](ctx context.Context, req *connect.Request[T]) (context.Context, *slog.Logger) {
	log := dlog.FromCtx(ctx)

	// Add streamId to log context if present in request
	if reqMsg, ok := any(req.Msg).(RequestWithStreamId); ok {
		streamId := reqMsg.GetStreamId()
		if streamId != "" {
			log = log.With("streamId", streamId)
			return dlog.CtxWithLog(ctx, log), log
		}
	}

	return ctx, log
}

func ParseEthereumAddress(address string) (common.Address, error) {
	if len(address) != 42 {
		return common.Address{}, RiverError(Err_BAD_ADDRESS, "invalid address length")
	}
	if address[:2] != "0x" {
		return common.Address{}, RiverError(Err_BAD_ADDRESS, "invalid address prefix")
	}
	return common.HexToAddress(address), nil
}

func totalQuorumNum(totalNumNodes int) int {
	return (totalNumNodes + 1) / 2
}

// Returns number of remotes that need to succeed for quorum based on where the local is present.
func remoteQuorumNum(remotes int, local bool) int {
	if local {
		return totalQuorumNum(remotes+1) - 1
	} else {
		return totalQuorumNum(remotes)
	}
}
