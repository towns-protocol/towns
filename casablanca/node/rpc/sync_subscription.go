package rpc

import (
	"casablanca/node/base"
	"casablanca/node/dlog"
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
	syncResponse syncResponse
}

type syncResponse interface {
	Send(msg *protocol.SyncStreamsResponse) error
}

func (s *syncSubscriptionImpl) existsLocalStreamId(streamId string) bool {
	_, exists := s.localStreams[streamId]
	return exists
}

func (s *syncSubscriptionImpl) addLocalStream(
	ctx context.Context,
	syncCookie *protocol.SyncCookie,
	stream *events.SyncStream,
) error {
	s.syncLock.Lock()
	defer s.syncLock.Unlock()
	// only add the stream if it doesn't already exist in the subscription
	if _, exists := s.localStreams[syncCookie.StreamId]; !exists {
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

func (s *syncSubscriptionImpl) existsRemoteAddress(address string) bool {
	_, exists := s.remoteNodes[address]
	return exists
}

func (s *syncSubscriptionImpl) addRemoteNode(
	address string,
	node *syncNode,
) bool {
	s.syncLock.Lock()
	defer s.syncLock.Unlock()
	// only add the node if it doesn't already exist in the subscription
	if _, exists := s.remoteNodes[address]; !exists {
		s.remoteNodes[address] = node
		return true // added
	}
	return false // not added
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

func (s *syncSubscriptionImpl) setErrorAndCancel(err error) {
	s.syncLock.Lock()
	if s.firstError == nil {
		s.firstError = err
	}
	s.syncLock.Unlock()

	s.cancel()
}

func (s *syncSubscriptionImpl) OnSyncError(err error) {
	if s.ctx.Err() != nil {
		return
	}
	s.setErrorAndCancel(err)
	dlog.CtxLog(s.ctx).Warn("OnSyncError: cancelling sync", "error", err)
}

func (s *syncSubscriptionImpl) OnUpdate(r *protocol.SyncStreamsResponse) {
	// cancel if context is done
	if s.ctx.Err() != nil {
		return
	}

	// send response
	r.SyncId = s.SyncId
	select {
	case s.channel <- r:
		return
	default:
		// end the update stream if the channel is full
		err :=
			base.RiverError(protocol.Err_BUFFER_FULL, "channel full, dropping update and canceling", "streamId", r.Stream.NextSyncCookie.StreamId).
				Func("OnUpdate").
				LogWarn(dlog.CtxLog(s.ctx))
		s.setErrorAndCancel(err)
		return
	}
}

func (s *syncSubscriptionImpl) Dispatch(resp syncResponse) {
	log := dlog.CtxLog(s.ctx)

	for {
		select {
		case <-s.ctx.Done():
			err := s.ctx.Err()
			s.setErrorAndCancel(err)
			log.Debug("SyncStreams: context done", "err", err)
			return
		case data := <-s.channel:
			log.Debug("SyncStreams: received response in dispatch loop", "syncId", s.SyncId, "data", data)
			if err := resp.Send(data); err != nil {
				log.Debug("SyncStreams: error sending response", "syncId", s.SyncId, "err", err)
				s.setErrorAndCancel(err)
				return
			}
		}
	}
}

func (s *syncSubscriptionImpl) getError() error {
	s.syncLock.Lock()
	defer s.syncLock.Unlock()
	return s.firstError
}
