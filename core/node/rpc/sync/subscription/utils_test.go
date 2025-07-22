package subscription

import (
	"context"

	"github.com/ethereum/go-ethereum/common"
	"github.com/puzpuzpuz/xsync/v4"
	"github.com/stretchr/testify/mock"

	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/sync/client"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

const testMessagesBufferSize = 2048 // Same as production

// createTestSubscription creates a properly initialized Subscription for testing
func createTestSubscription(syncID string) *Subscription {
	ctx, cancel := context.WithCancelCause(context.Background())
	return &Subscription{
		syncID:              syncID,
		Messages:            xsync.NewSPSCQueue[*SyncStreamsResponse](testMessagesBufferSize),
		ctx:                 ctx,
		cancel:              cancel,
		initializingStreams: xsync.NewMap[StreamId, struct{}](),
		backfillEvents:      xsync.NewMap[StreamId, map[common.Hash]struct{}](),
		registry:            newRegistry(),
		log:                 testutils.DiscardLogger(),
	}
}

// mockSyncerSet for testing
type mockSyncerSet struct {
	mock.Mock
}

func (m *mockSyncerSet) Modify(ctx context.Context, req client.ModifyRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

// Helper function to dequeue all messages from SPSCQueue (similar to GetBatch)
func dequeueAll(queue *xsync.SPSCQueue[*SyncStreamsResponse]) []*SyncStreamsResponse {
	var messages []*SyncStreamsResponse
	for {
		msg, ok := queue.TryDequeue()
		if !ok {
			break
		}
		messages = append(messages, msg)
	}
	return messages
}
