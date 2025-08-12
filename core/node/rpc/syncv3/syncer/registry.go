package syncer

import (
	"sync"

	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type registryImpl struct {
	syncersLock sync.Mutex
	syncers     map[StreamId]StreamUpdateEmitter
}

// NewRegistry creates a new instance of the Registry.
func NewRegistry() *registryImpl {
	return &registryImpl{
		syncers: make(map[StreamId]StreamUpdateEmitter),
	}
}

func (r *registryImpl) Subscribe(streamID StreamId, subscriber StreamSubscriber) {
	// TODO: Implement me
	panic("implement me")
}

func (r *registryImpl) Unsubscribe(streamID StreamId, subscriber StreamSubscriber) {
	// TODO: Implement me
	panic("implement me")
}

func (r *registryImpl) Backfill(cookie *SyncCookie, syncIDs []string) error {
	// TODO: Implement me
	panic("implement me")
}
