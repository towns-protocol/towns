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
	SyncId        string
	cancel        context.CancelFunc
	channel       chan *protocol.SyncStreamsResponse
	ctx           context.Context
	firstError    error
	localStreams  map[string]*events.SyncStream // mapping of streamId to local stream
	remoteStreams map[string]*syncNode          // mapping of streamId to remote node
	remoteNodes   map[string]*syncNode          // mapping of node address to remote node
	syncLock      sync.Mutex
	syncResponse  syncResponse
}

type syncResponse interface {
	Send(msg *protocol.SyncStreamsResponse) error
}

func (s *syncSubscriptionImpl) existsLocalStream(streamId string) bool {
	_, exists := s.localStreams[streamId]
	return exists
}

func (s *syncSubscriptionImpl) existsRemoteAddress(address string) bool {
	_, exists := s.remoteNodes[address]
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
		err := (*stream).Sub(ctx, syncCookie, s)
		if err != nil {
			return err
		}
		s.localStreams[syncCookie.StreamId] = stream
	}
	return nil
}

func (s *syncSubscriptionImpl) removeLocalStream(
	streamId string,
) bool {
	s.syncLock.Lock()
	defer s.syncLock.Unlock()
	if stream := s.localStreams[streamId]; stream != nil {
		(*stream).Unsub(s)
		delete(s.localStreams, streamId)
		return true // removed
	}
	return false // not removed
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

func (s *syncSubscriptionImpl) addRemoteStream(
	cookie *protocol.SyncCookie,
) {
	s.syncLock.Lock()
	defer s.syncLock.Unlock()
	if remote := s.remoteNodes[cookie.NodeAddress]; remote != nil {
		s.remoteStreams[cookie.StreamId] = remote
	}
}

func (s *syncSubscriptionImpl) removeRemoteStream(
	streamId string,
) bool {
	s.syncLock.Lock()
	defer s.syncLock.Unlock()
	if remote := s.remoteStreams[streamId]; remote != nil {
		delete(s.remoteStreams, streamId)
		return true // removed
	}
	return false // not removed
}

func (s *syncSubscriptionImpl) purgeUnusedRemoteNodes() {
	s.syncLock.Lock()
	defer s.syncLock.Unlock()
	nodesToRemove := make([]*syncNode, 0)
	for _, remote := range s.remoteNodes {
		isUsed := false
		for _, n := range s.remoteStreams {
			if n == remote {
				isUsed = true
				break
			}
		}
		if !isUsed {
			nodesToRemove = append(nodesToRemove, remote)
		}
	}
	// now purge the nodes
	for _, remote := range nodesToRemove {
		remote.close()
		delete(s.remoteNodes, remote.address)
	}
}

func (s *syncSubscriptionImpl) closeAllRemoteNodes() {
	s.syncLock.Lock()
	defer s.syncLock.Unlock()
	for key, node := range s.remoteNodes {
		node.close()
		delete(s.remoteNodes, key)
	}
	for key := range s.remoteStreams {
		delete(s.remoteStreams, key)
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
	dlog.CtxLog(s.ctx).Warn("SyncStreams:syncSubscriptionImpl:OnSyncError: cancelling sync", "error", err)
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
			log.Debug("SyncStreams:syncSubscriptionImpl:Dispatch received response in dispatch loop", "syncId", s.SyncId, "data", data)
			if err := resp.Send(data); err != nil {
				log.Debug("SyncStreams:syncSubscriptionImpl:Dispatch error sending response", "syncId", s.SyncId, "err", err)
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
