package rpc

import (
	. "casablanca/node/base"
	"casablanca/node/dlog"
	. "casablanca/node/protocol"
	"math/rand"
	"time"

	"context"

	"github.com/bufbuild/connect-go"
	"github.com/ethereum/go-ethereum/common"
	"golang.org/x/exp/slog"
)

type RequestWithStreamId interface {
	GetStreamId() string
}

func ctxAndLogForRequest[T any](ctx context.Context, req *connect.Request[T]) (context.Context, *slog.Logger) {
	log := dlog.CtxLog(ctx)

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

const alphanumerics = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

// RandomString generates a pseudo-random string of length n.
func RandomString(n int) string {
	source := rand.NewSource(time.Now().UnixNano())
	rng := rand.New(source)
	b := make([]byte, n)
	for i := range b {
		b[i] = alphanumerics[rng.Int63()%int64(len(alphanumerics))]
	}
	return string(b)
}
