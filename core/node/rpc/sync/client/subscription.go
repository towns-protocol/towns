package client

import (
	"context"

	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/sync/dynmsgbuf"
)

type subscription struct {
	ctx      context.Context
	cancel   context.CancelCauseFunc
	syncID   string
	messages *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse]
}

func newSubscription(
	ctx context.Context,
	cancel context.CancelCauseFunc,
	syncID string,
) *subscription {
	return &subscription{
		ctx:      ctx,
		cancel:   cancel,
		syncID:   syncID,
		messages: dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse](),
	}
}

func (s *subscription) Close(err error) {
	s.messages.Close()
	s.cancel(err)
}
