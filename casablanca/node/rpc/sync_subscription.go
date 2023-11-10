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
	select {
	case s.channel <- r:
		return
	default:
		// end the update stream if the channel is full
		err :=
			base.RiverError(protocol.Err_BUFFER_FULL, "channel full, dropping update and canceling", "streamId", r.Streams[0].NextSyncCookie.StreamId).
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
