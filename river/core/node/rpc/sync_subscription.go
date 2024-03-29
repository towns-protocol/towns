package rpc

import (
	"context"
	"log/slog"
	"sync"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/events"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
)

type syncOp interface {
	getOp() SyncOp
}

type baseSyncOp struct {
	op SyncOp
}

func (d *baseSyncOp) getOp() SyncOp {
	return d.op
}

type pingOp struct {
	baseSyncOp
	nonce string // used to match a response to a ping request
}

type syncSubscriptionImpl struct {
	ctx    context.Context
	syncId string
	cancel context.CancelFunc

	mu             sync.Mutex
	firstError     error
	dataChannel    chan *StreamAndCookie
	controlChannel chan syncOp
	localStreams   map[StreamId]*events.SyncStream // mapping of streamId to local stream
	remoteStreams  map[StreamId]*syncNode          // mapping of streamId to remote node
	remoteNodes    map[common.Address]*syncNode    // mapping of node address to remote node
}

func newSyncSubscription(
	ctx context.Context,
	syncId string,
) *syncSubscriptionImpl {
	syncCtx, cancelSync := context.WithCancel(ctx)
	return &syncSubscriptionImpl{
		ctx:            syncCtx,
		syncId:         syncId,
		cancel:         cancelSync,
		dataChannel:    make(chan *StreamAndCookie, 256),
		controlChannel: make(chan syncOp, 64),
		localStreams:   make(map[StreamId]*events.SyncStream),
		remoteStreams:  make(map[StreamId]*syncNode),
		remoteNodes:    make(map[common.Address]*syncNode),
	}
}

type syncStream interface {
	Send(msg *SyncStreamsResponse) error
}

func (s *syncSubscriptionImpl) addLocalStream(
	ctx context.Context,
	syncCookie *SyncCookie,
	stream *events.SyncStream,
) error {
	log := dlog.FromCtx(ctx)
	log.Debug(
		"SyncStreams:syncSubscriptionImpl:addLocalStream: adding local stream",
		"syncId",
		s.syncId,
		"streamId",
		syncCookie.StreamId,
	)
	streamId, err := StreamIdFromBytes(syncCookie.StreamId)
	if err != nil {
		return err
	}

	var exists bool

	s.mu.Lock()

	// only add the stream if it doesn't already exist in the subscription
	if _, exists = s.localStreams[streamId]; !exists {
		s.localStreams[streamId] = stream
	}
	s.mu.Unlock()

	if exists {
		log.Debug(
			"SyncStreams:syncSubscriptionImpl:addLocalStream: local stream already exists",
			"syncId",
			s.syncId,
			"streamId",
			syncCookie.StreamId,
		)
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
	streamId StreamId,
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
	cookies []*SyncCookie,
) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.remoteNodes[node.address]; !exists {
		s.remoteNodes[node.address] = node
	} else {
		node = s.remoteNodes[node.address]
	}
	for _, cookie := range cookies {
		streamId, err := StreamIdFromBytes(cookie.StreamId)
		if err != nil {
			return err
		}
		s.remoteStreams[streamId] = node
	}
	return nil
}

func (s *syncSubscriptionImpl) addRemoteNode(
	address common.Address,
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
	streamId StreamId,
) *events.SyncStream {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.localStreams[streamId]
}

func (s *syncSubscriptionImpl) getRemoteNode(
	address common.Address,
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
	cookie *SyncCookie,
) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	nodeAddress := common.BytesToAddress(cookie.NodeAddress)
	if remote := s.remoteNodes[nodeAddress]; remote != nil {
		streamId, err := StreamIdFromBytes(cookie.StreamId)
		if err != nil {
			return err
		}
		s.remoteStreams[streamId] = remote
	}
	return nil
}

func (s *syncSubscriptionImpl) removeRemoteStream(
	streamId StreamId,
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

	log.Debug(
		"SyncStreams:syncSubscriptionImpl:purgeUnusedRemoteNodes: purging unused remote nodes",
		"syncId",
		s.syncId,
	)

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
	log := dlog.FromCtx(s.ctx)
	log.Info("SyncStreams:syncSubscriptionImpl:OnSyncError: received error", "error", err)
	s.setErrorAndCancel(err)
	log.Warn("SyncStreams:syncSubscriptionImpl:OnSyncError: cancelling sync", "error", err)
}

func (s *syncSubscriptionImpl) OnUpdate(r *StreamAndCookie) {
	// cancel if context is done
	if s.ctx.Err() != nil {
		return
	}

	select {
	case s.dataChannel <- r:
		return
	default:
		// end the update stream if the channel is full
		err := RiverError(
			Err_BUFFER_FULL,
			"channel full, dropping update and canceling",
			"streamId",
			r.NextSyncCookie.StreamId,
		).
			Func("OnUpdate").
			LogWarn(dlog.FromCtx(s.ctx))
		s.setErrorAndCancel(err)
		return
	}
}

func (s *syncSubscriptionImpl) OnClose() {
	// cancel if context is done
	if s.ctx.Err() != nil {
		return
	}

	log := dlog.FromCtx(s.ctx)
	log.Debug("SyncStreams:OnClose: closing stream", "syncId", s.syncId)
	c := baseSyncOp{
		op: SyncOp_SYNC_CLOSE,
	}
	select {
	case s.controlChannel <- &c:
		return
	default:
		log.Info("SyncStreams:OnClose: control channel full")
		return
	}
}

func (s *syncSubscriptionImpl) Dispatch(res *connect.ServerStream[SyncStreamsResponse]) {
	log := dlog.FromCtx(s.ctx)

	for {
		select {
		case <-s.ctx.Done():
			err := s.ctx.Err()
			s.setErrorAndCancel(err)
			log.Debug("SyncStreams: context done", "err", err)
			return
		case data, ok := <-s.dataChannel:
			log.Debug(
				"SyncStreams: Dispatch received response in dispatch loop",
				"syncId",
				s.syncId,
				"data",
				data,
			)
			if ok {
				// gather the response metadata + content, and send it
				resp := events.SyncStreamsResponseFromStreamAndCookie(data)
				resp.SyncId = s.syncId
				resp.SyncOp = SyncOp_SYNC_UPDATE
				if err := res.Send(resp); err != nil {
					log.Info("SyncStreams: Dispatch error sending response", "syncId", s.syncId, "err", err)
					s.setErrorAndCancel(err)
					return
				}
			} else {
				log.Debug("SyncStreams: Dispatch data channel closed", "syncId", s.syncId)
			}
		case control := <-s.controlChannel:
			log.Debug("SyncStreams: Dispatch received control message", "syncId", s.syncId, "control", control)
			if control.getOp() == SyncOp_SYNC_CLOSE {
				err := res.Send(&SyncStreamsResponse{
					SyncId: s.syncId,
					SyncOp: SyncOp_SYNC_CLOSE,
				})
				if err != nil {
					log.Warn(
						"SyncStreams: Dispatch error sending close response",
						"syncId",
						s.syncId,
						"err",
						err,
					)
					log.Warn("SyncStreams: error closing stream", "err", err)
				}
				s.cancel()
				log.Debug("SyncStreams: closed stream", "syncId", s.syncId)
			} else if control.getOp() == SyncOp_SYNC_PONG {
				log.Debug("SyncStreams: send pong to client", "syncId", s.syncId)
				data := control.(*pingOp)
				err := res.Send(&SyncStreamsResponse{
					SyncId:    s.syncId,
					SyncOp:    SyncOp_SYNC_PONG,
					PongNonce: data.nonce,
				})
				if err != nil {
					log.Warn("SyncStreams: cancel stream because of error sending pong response", "syncId", s.syncId, "err", err)
					s.cancel()
				}
			} else {
				log.Warn("SyncStreams: Dispatch received unknown control message", "syncId", s.syncId, "control", control)
			}
		}
	}
}

func (s *syncSubscriptionImpl) getError() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.firstError
}
