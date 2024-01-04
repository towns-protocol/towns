package rpc

import (
	"casablanca/node/base"
	"casablanca/node/dlog"
	"casablanca/node/events"
	"casablanca/node/protocol"
	"context"
	"sync"

	connect_go "github.com/bufbuild/connect-go"
	"golang.org/x/exp/slog"
)

type syncSubscriptionImpl struct {
	syncId         string
	cancel         context.CancelFunc
	dataChannel    chan *protocol.StreamAndCookie
	controlChannel chan *protocol.SyncOp
	ctx            context.Context
	firstError     error
	localStreams   map[string]*events.SyncStream // mapping of streamId to local stream
	remoteStreams  map[string]*syncNode          // mapping of streamId to remote node
	remoteNodes    map[string]*syncNode          // mapping of node address to remote node
	mu             sync.Mutex
}

type syncStream interface {
	Send(msg *protocol.SyncStreamsResponse) error
}

func (s *syncSubscriptionImpl) addLocalStream(
	ctx context.Context,
	syncCookie *protocol.SyncCookie,
	stream *events.SyncStream,
) error {
	log := dlog.CtxLog(ctx)
	log.Debug("SyncStreams:syncSubscriptionImpl:addLocalStream: adding local stream", "syncId", s.syncId, "streamId", syncCookie.StreamId)

	var exists bool

	s.mu.Lock()
	// only add the stream if it doesn't already exist in the subscription
	if _, exists = s.localStreams[syncCookie.StreamId]; !exists {
		s.localStreams[syncCookie.StreamId] = stream
	}
	s.mu.Unlock()

	if exists {
		log.Debug("SyncStreams:syncSubscriptionImpl:addLocalStream: local stream already exists", "syncId", s.syncId, "streamId", syncCookie.StreamId)
	} else {
		// subscribe to the stream
		err := (*stream).Sub(ctx, syncCookie, s)
		if err != nil {
			log.Error("SyncStreams:syncSubscriptionImpl:addLocalStream: error subscribing to stream", "syncId", s.syncId, "streamId", syncCookie.StreamId, "err", err)
			return err
		}
		log.Debug("SyncStreams:syncSubscriptionImpl:addLocalStream: added local stream", "syncId", s.syncId, "streamId", syncCookie.StreamId)
	}

	return nil
}

func (s *syncSubscriptionImpl) removeLocalStream(
	streamId string,
) {
	var stream *events.SyncStream

	s.mu.Lock()
	if st := s.localStreams[streamId]; st != nil {
		stream = st
		delete(s.localStreams, streamId)
	}
	s.mu.Unlock()

	if stream != nil {
		(*stream).Unsub(s)
	}
}

func (s *syncSubscriptionImpl) unsubLocalStreams() {
	s.mu.Lock()
	defer s.mu.Unlock()
	for key, st := range s.localStreams {
		stream := *st
		stream.Unsub(s)
		delete(s.localStreams, key)
	}
}

func (s *syncSubscriptionImpl) addSyncNode(
	node *syncNode,
	cookies []*protocol.SyncCookie,
) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.remoteNodes[node.address]; !exists {
		s.remoteNodes[node.address] = node
	} else {
		node = s.remoteNodes[node.address]
	}
	for _, cookie := range cookies {
		s.remoteStreams[cookie.StreamId] = node
	}
}

func (s *syncSubscriptionImpl) addRemoteNode(
	address string,
	node *syncNode,
) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	// only add the node if it doesn't already exist in the subscription
	if _, exists := s.remoteNodes[address]; !exists {
		s.remoteNodes[address] = node
		return true // added
	}
	return false // not added
}

func (s *syncSubscriptionImpl) getLocalStream(
	streamId string,
) *events.SyncStream {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.localStreams[streamId]
}

func (s *syncSubscriptionImpl) getRemoteNode(
	address string,
) *syncNode {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.remoteNodes[address]
}

func (s *syncSubscriptionImpl) getRemoteNodes() []*syncNode {
	copy := make([]*syncNode, 0)
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, node := range s.remoteNodes {
		copy = append(copy, node)
	}
	return copy
}

func (s *syncSubscriptionImpl) addRemoteStream(
	cookie *protocol.SyncCookie,
) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if remote := s.remoteNodes[cookie.NodeAddress]; remote != nil {
		s.remoteStreams[cookie.StreamId] = remote
	}
}

func (s *syncSubscriptionImpl) removeRemoteStream(
	streamId string,
) *syncNode {
	s.mu.Lock()
	defer s.mu.Unlock()
	if remote := s.remoteStreams[streamId]; remote != nil {
		delete(s.remoteStreams, streamId)
		return remote
	}
	return nil
}

func (s *syncSubscriptionImpl) purgeUnusedRemoteNodes(log *slog.Logger) {

	nodesToRemove := make([]*syncNode, 0)

	log.Debug("SyncStreams:syncSubscriptionImpl:purgeUnusedRemoteNodes: purging unused remote nodes", "syncId", s.syncId)

	s.mu.Lock()
	if len(s.remoteNodes) > 0 {
		for _, remote := range s.remoteNodes {
			isUsed := false
			if len(s.remoteStreams) > 0 {
				for _, n := range s.remoteStreams {
					if n == remote {
						isUsed = true
						break
					}
				}
				if !isUsed {
					nodesToRemove = append(nodesToRemove, remote)
					delete(s.remoteNodes, remote.address)
				}
			}
		}
	}
	s.mu.Unlock()

	// now purge the nodes
	for _, remote := range nodesToRemove {
		if remote != nil {
			remote.close()
		}
	}

	log.Debug("SyncStreams:syncSubscriptionImpl:purgeUnusedRemoteNodes: purged remote nodes done", "syncId", s.syncId)
}

func (s *syncSubscriptionImpl) deleteRemoteNodes() {
	s.mu.Lock()
	defer s.mu.Unlock()
	for key := range s.remoteNodes {
		delete(s.remoteNodes, key)
	}
	for key := range s.remoteStreams {
		delete(s.remoteStreams, key)
	}
}

func (s *syncSubscriptionImpl) setErrorAndCancel(err error) {
	s.mu.Lock()
	if s.firstError == nil {
		s.firstError = err
	}
	s.mu.Unlock()

	s.cancel()
}

func (s *syncSubscriptionImpl) OnSyncError(err error) {
	if s.ctx.Err() != nil {
		return
	}
	log := dlog.CtxLog(s.ctx)
	log.Info("SyncStreams:syncSubscriptionImpl:OnSyncError: received error", "error", err)
	s.setErrorAndCancel(err)
	log.Warn("SyncStreams:syncSubscriptionImpl:OnSyncError: cancelling sync", "error", err)
}

func (s *syncSubscriptionImpl) OnUpdate(r *protocol.StreamAndCookie) {
	// cancel if context is done
	if s.ctx.Err() != nil {
		return
	}

	select {
	case s.dataChannel <- r:
		return
	default:
		// end the update stream if the channel is full
		err :=
			base.RiverError(protocol.Err_BUFFER_FULL, "channel full, dropping update and canceling", "streamId", r.NextSyncCookie.StreamId).
				Func("OnUpdate").
				LogWarn(dlog.CtxLog(s.ctx))
		s.setErrorAndCancel(err)
		return
	}
}

func (s *syncSubscriptionImpl) OnClose() {
	// cancel if context is done
	if s.ctx.Err() != nil {
		return
	}

	log := dlog.CtxLog(s.ctx)
	log.Debug("SyncStreams:syncSubscriptionImpl:OnClose: closing stream", "syncId", s.syncId)
	c := protocol.SyncOp_SYNC_CLOSE
	select {
	case s.controlChannel <- &c:
		return
	default:
		log.Info("SyncStreams:syncSubscriptionImpl:OnClose: control channel full")
		return
	}
}

func (s *syncSubscriptionImpl) Dispatch(res *connect_go.ServerStream[protocol.SyncStreamsResponse]) {
	log := dlog.CtxLog(s.ctx)

	for {
		select {
		case <-s.ctx.Done():
			err := s.ctx.Err()
			s.setErrorAndCancel(err)
			log.Debug("SyncStreams: context done", "err", err)
			return
		case data, ok := <-s.dataChannel:
			log.Debug("SyncStreams:syncSubscriptionImpl:Dispatch received response in dispatch loop", "syncId", s.syncId, "data", data)
			if ok {
				// gather the response metadata + content, and send it
				resp := events.SyncStreamsResponseFromStreamAndCookie(data)
				resp.SyncId = s.syncId
				resp.SyncOp = protocol.SyncOp_SYNC_UPDATE
				if err := res.Send(resp); err != nil {
					log.Info("SyncStreams:syncSubscriptionImpl:Dispatch error sending response", "syncId", s.syncId, "err", err)
					s.setErrorAndCancel(err)
					return
				}
			} else {
				log.Debug("SyncStreams:syncSubscriptionImpl:Dispatch data channel closed", "syncId", s.syncId)
			}
		case control := <-s.controlChannel:
			log.Debug("SyncStreams:syncSubscriptionImpl Dispatch received control message", "syncId", s.syncId, "control", control)
			if *control == protocol.SyncOp_SYNC_CLOSE {
				err := res.Send(&protocol.SyncStreamsResponse{
					SyncId: s.syncId,
					SyncOp: protocol.SyncOp_SYNC_CLOSE,
				})
				if err != nil {
					log.Info("SyncStreams:syncSubscriptionImpl:Dispatch error sending close response", "syncId", s.syncId, "err", err)
					dlog.CtxLog(s.ctx).Warn("SyncStreams:syncSubscriptionImpl:closeStream: error canceling stream", "err", err)
				}
				s.cancel()
				log.Debug("SyncStreams:syncSubscriptionImpl:Dispatch: closed stream", "syncId", s.syncId)
			} else {
				log.Warn("SyncStreams:syncSubscriptionImpl:Dispatch unknown control message", "syncId", s.syncId, "control", control)
			}
		}
	}
}

func (s *syncSubscriptionImpl) getError() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.firstError
}
