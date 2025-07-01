package subscription

import (
	"context"

	"github.com/ethereum/go-ethereum/common"
	"github.com/puzpuzpuz/xsync/v4"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/sync/dynmsgbuf"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// createTestSubscription creates a properly initialized Subscription for testing
func createTestSubscription(syncID string) *Subscription {
	ctx, cancel := context.WithCancelCause(context.Background())
	return &Subscription{
		syncID:              syncID,
		Messages:            dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse](),
		ctx:                 ctx,
		cancel:              cancel,
		initializingStreams: xsync.NewMap[StreamId, struct{}](),
		backfillEvents:      xsync.NewMap[StreamId, []common.Hash](),
	}
}
