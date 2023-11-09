package rpc

import (
	"casablanca/node/events"
	"casablanca/node/protocol"
	"context"
	"sync"
)

type syncSubscriptionImpl struct {
	SyncId       string
	cancel       context.CancelFunc
	channel      chan *protocol.SyncStreamsResponse
	ctx          context.Context
	firstError   error
	localStreams map[string]*events.SyncStream
	remoteNodes  map[string]*syncNode
	syncLock     sync.Mutex
	syncHandler  SyncHandler
	syncResponse syncResponse
}

type syncResponse interface {
	Send(msg *protocol.SyncStreamsResponse) error
}

func (s *syncSubscriptionImpl) addLocalStreamIdIfNew(streamId string) bool {
	s.syncLock.Lock()
	defer s.syncLock.Unlock()
	if _, ok := s.localStreams[streamId]; !ok {
		s.localStreams[streamId] = nil
		return true // added
	}
	return false // not added
}

func (s *syncSubscriptionImpl) addLocalStream(
	ctx context.Context,
	syncCookie *protocol.SyncCookie,
	stream *events.SyncStream,
) error {
	s.syncLock.Lock()
	defer s.syncLock.Unlock()
	if _, ok := s.localStreams[syncCookie.StreamId]; !ok {
		s.localStreams[syncCookie.StreamId] = stream
		err := (*stream).Sub(ctx, syncCookie, s)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *syncSubscriptionImpl) unsubAllLocalStreams() {
	s.syncLock.Lock()
	defer s.syncLock.Unlock()
	for key, sub := range s.localStreams {
		stream := *sub
		stream.Unsub(s)
		delete(s.localStreams, key)
	}
}

func (s *syncSubscriptionImpl) addRemoteAddressIfNew(address string) bool {
	s.syncLock.Lock()
	defer s.syncLock.Unlock()
	if _, ok := s.remoteNodes[address]; !ok {
		s.remoteNodes[address] = nil
		return true // added
	}
	return false // not added
}

func (s *syncSubscriptionImpl) addRemoteNode(
	address string,
	node *syncNode,
) {
	s.syncLock.Lock()
	defer s.syncLock.Unlock()
	if _, ok := s.remoteNodes[address]; !ok {
		s.remoteNodes[address] = node
	}
}

func (s *syncSubscriptionImpl) closeAllRemoteNodes() {
	s.syncLock.Lock()
	defer s.syncLock.Unlock()
	for key, node := range s.remoteNodes {
		node.close()
		delete(s.remoteNodes, key)
	}
}

func (s *syncSubscriptionImpl) close() {
	s.unsubAllLocalStreams()
	s.closeAllRemoteNodes()
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

func (s *syncSubscriptionImpl) getError() error {
	s.syncLock.Lock()
	defer s.syncLock.Unlock()
	return s.firstError
}
