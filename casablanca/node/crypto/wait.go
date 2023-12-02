package crypto

import (
	"context"
	"errors"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"

	. "casablanca/node/base"
	. "casablanca/node/protocol"
)

func WaitMined(
	ctx context.Context,
	b *ethclient.Client,
	txHash common.Hash,
	pollPeriod time.Duration,
	maxWait time.Duration,
) (*types.Receipt, error) {
	queryTicker := time.NewTicker(pollPeriod)
	defer queryTicker.Stop()
	maxWaitTimer := time.NewTimer(maxWait)
	defer maxWaitTimer.Stop()

	for {
		receipt, err := b.TransactionReceipt(ctx, txHash)
		if err == nil {
			return receipt, nil
		}

		if !errors.Is(err, ethereum.NotFound) {
			return nil, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).Func("WaitMined").Message("Cannot get transaction receipt")
		}

		// Wait for the next round.
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-maxWaitTimer.C:
			return nil, RiverError(Err_CANNOT_CALL_CONTRACT, "Timeout waiting for transaction to be mined").Func("WaitMined")
		case <-queryTicker.C:
		}
	}
}
