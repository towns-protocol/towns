package rpc

import (
	"casablanca/node/base"
	"casablanca/node/events"
	"casablanca/node/protocol"
)

type SyncSubscription interface {
	OnUpdate(r *protocol.SyncStreamsResponse)
	OnSyncError(streamId, err error)
	Dispatch(resp syncResponse)
}

type syncSubscriptionImpl struct {
	SyncId string
	//ctx              context.Context
	//cancel           context.CancelFunc
	streamIdToStream map[string]*events.Stream
	//streamLock       sync.Mutex
	syncHandler  SyncHandler
	syncResponse syncResponse
	channel      chan *protocol.SyncStreamsResponse
}

type syncResponse interface {
	Send(msg *protocol.SyncStreamsResponse) error
}

func (s *syncSubscriptionImpl) AddStreamsToSync() error {
	return base.RiverError(protocol.Err_UNIMPLEMENTED, "Not Implemented").Func("AddStreamsToSync")
}

func (s *syncSubscriptionImpl) RemoveStreamsFromSync() error {
	return base.RiverError(protocol.Err_UNIMPLEMENTED, "Not Implemented").Func("RemoveStreamsFromSync")
}

func (s *syncSubscriptionImpl) OnSyncError(err error) {
	// todo
}

func (s *syncSubscriptionImpl) OnUpdate(r *protocol.SyncStreamsResponse) {
	// todo
}

func (s *syncSubscriptionImpl) Dispatch(resp syncResponse) {
	// todo
}
