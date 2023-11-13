package rpc

import (
	"casablanca/node/base"
	"casablanca/node/crypto"
	"casablanca/node/dlog"
	"casablanca/node/events"
	"casablanca/node/nodes"
	"casablanca/node/protocol"
	"casablanca/node/protocol/protocolconnect"
	"context"
	"errors"
	"sync"

	connect_go "github.com/bufbuild/connect-go"
	"github.com/google/uuid"
)

// TODO: wire metrics.
// var (
// 	syncStreamsRequests   = infra.NewSuccessMetrics("sync_streams_requests", serviceRequests)
// 	syncStreamsResultSize = infra.NewCounter("sync_streams_result_size", "The total number of events returned by sync streams")
// )

// func addUpdatesToCounter(updates []*StreamAndCookie) {
// 	for _, stream := range updates {
// 		syncStreamsResultSize.Add(float64(len(stream.Events)))
// 	}
// }

func NewSyncHandler(
	ctx context.Context,
	syncVersion int,
	wallet *crypto.Wallet,
	cache events.StreamCache,
	nodeRegistry nodes.NodeRegistry,
) SyncHandler {
	log := dlog.CtxLog(ctx)
	if syncVersion == 2 {
		log.Debug("Using SyncHandlerV2")
		return &SyncHandlerV2{
			wallet:               wallet,
			cache:                cache,
			nodeRegistry:         nodeRegistry,
			syncLock:             sync.Mutex{},
			syncIdToSubscription: make(map[string]*syncSubscriptionImpl),
		}
	}
	log.Debug("Using SyncHandlerV1")
	return &SyncHandlerV1{
		wallet:       wallet,
		cache:        cache,
		nodeRegistry: nodeRegistry,
	}
}

type SyncHandler interface {
	SyncStreams(
		ctx context.Context,
		req *connect_go.Request[protocol.SyncStreamsRequest],
		res *connect_go.ServerStream[protocol.SyncStreamsResponse],
	) error
	AddStreamsToSync(
		ctx context.Context,
		req *connect_go.Request[protocol.AddStreamsToSyncRequest],
	) (*connect_go.Response[protocol.AddStreamsToSyncResponse], error)
	RemoveStreamsFromSync(
		ctx context.Context,
		req *connect_go.Request[protocol.RemoveStreamsFromSyncRequest],
	) (*connect_go.Response[protocol.RemoveStreamsFromSyncResponse], error)
}

type SyncHandlerV1 struct {
	wallet       *crypto.Wallet
	cache        events.StreamCache
	nodeRegistry nodes.NodeRegistry
}

type SyncHandlerV2 struct {
	wallet               *crypto.Wallet
	cache                events.StreamCache
	nodeRegistry         nodes.NodeRegistry
	syncLock             sync.Mutex
	syncIdToSubscription map[string]*syncSubscriptionImpl
}

type syncNode struct {
	syncPos []*protocol.SyncCookie
	stub    protocolconnect.StreamServiceClient

	mu     sync.Mutex
	stream *connect_go.ServerStreamForClient[protocol.SyncStreamsResponse]
	closed bool
}

func (s *Service) SyncStreams(
	ctx context.Context,
	req *connect_go.Request[protocol.SyncStreamsRequest],
	res *connect_go.ServerStream[protocol.SyncStreamsResponse],
) error {
	return s.syncHandler.SyncStreams(ctx, req, res)
}

func (s *Service) AddStreamsToSync(
	ctx context.Context,
	req *connect_go.Request[protocol.AddStreamsToSyncRequest],
) (*connect_go.Response[protocol.AddStreamsToSyncResponse], error) {
	return s.syncHandler.AddStreamsToSync(ctx, req)
}

func (s *Service) RemoveStreamsFromSync(
	ctx context.Context,
	req *connect_go.Request[protocol.RemoveStreamsFromSyncRequest],
) (*connect_go.Response[protocol.RemoveStreamsFromSyncResponse], error) {
	return s.syncHandler.RemoveStreamsFromSync(ctx, req)
}

func (s *SyncHandlerV2) SyncStreams(
	ctx context.Context,
	req *connect_go.Request[protocol.SyncStreamsRequest],
	res *connect_go.ServerStream[protocol.SyncStreamsResponse],
) error {
	ctx, log := ctxAndLogForRequest(ctx, req)
	// generate a random syncId
	syncId := uuid.New().String()
	log.Debug("SyncHandlerV2.SyncStreams ENTER", "syncId", syncId, "syncPos", req.Msg.SyncPos)
	// return the syncId to the client
	e := res.Send(&protocol.SyncStreamsResponse{
		SyncId: syncId,
	})
	if e != nil {
		err := base.AsRiverError(e).Func("SyncStreams")
		log.Debug("SyncHandlerV2.SyncStreams: failed to send syncId", "res", res, "err", err, "syncId", syncId)
		return err
	}
	e = s.handleSyncRequest(ctx, req, res, syncId)
	if e != nil {
		err := base.AsRiverError(e).Func("SyncStreams")
		if err.Code == protocol.Err_CANCELED {
			// Context is canceled when client disconnects, so this is normal case.
			_ = err.LogDebug(log)
		} else {
			_ = err.LogWarn(log)
		}
		return err.AsConnectError()
	}
	// no errors
	log.Debug("SyncHandlerV2.SyncStreams LEAVE")
	return nil
}

func (s *SyncHandlerV2) handleSyncRequest(
	ctx context.Context,
	req *connect_go.Request[protocol.SyncStreamsRequest],
	res *connect_go.ServerStream[protocol.SyncStreamsResponse],
	syncId string,
) error {
	log := dlog.CtxLog(ctx)

	subscription, err := s.AddSubscription(ctx, req, res, syncId)
	if err != nil {
		return err
	}

	defer func() {
		s.RemoveSubscription(ctx, syncId)
	}()

	localCookies, remoteCookies := s.getLocalAndRemoteCookies(req.Msg.SyncPos)

	for _, cookie := range remoteCookies {
		nodeAddr := cookie.NodeAddress
		if subscription.existsRemoteAddress(nodeAddr) {
			stub, err := s.nodeRegistry.GetRemoteStubForAddress(nodeAddr)
			if err != nil {
				// TODO: Handle the case when node is no longer available.
				return err
			}
			if stub == nil {
				panic("stub always should set for the remote node")
			}

			r := &syncNode{
				syncPos: []*protocol.SyncCookie{},
				stub:    stub,
			}
			subscription.addRemoteNode(nodeAddr, r)
		}
		remote := subscription.remoteNodes[nodeAddr]
		remote.syncPos = append(remote.syncPos, cookie)
	}

	if len(localCookies) > 0 {
		go s.syncLocalNode(ctx, localCookies, subscription)
	}

	for _, remote := range subscription.remoteNodes {
		go remote.syncRemoteNode(ctx, subscription)
	}

	// start the sync loop
	subscription.Dispatch(res)

	err = subscription.getError()
	if err != nil {
		return err
	}

	log.Error("SyncStreams: sync always should be terminated by context cancel.")
	return nil
}

func (s *SyncHandlerV2) getLocalAndRemoteCookies(cookies []*protocol.SyncCookie) (local []*protocol.SyncCookie, remote []*protocol.SyncCookie) {
	local = make([]*protocol.SyncCookie, 0, 8)
	remote = make([]*protocol.SyncCookie, 0, 8)
	for _, cookie := range cookies {
		if cookie.NodeAddress == s.wallet.AddressStr {
			local = append(local, cookie)
		} else {
			remote = append(remote, cookie)
		}
	}
	return
}

func (s *SyncHandlerV2) syncLocalNode(
	ctx context.Context,
	syncPos []*protocol.SyncCookie,
	subscription *syncSubscriptionImpl,
) {
	log := dlog.CtxLog(ctx)

	if ctx.Err() != nil {
		log.Debug("SyncHandlerV2.SyncStreams: syncLocalNode not starting", "context_error", ctx.Err())
		return
	}

	err := s.syncLocalStreamsImpl(ctx, syncPos, subscription)
	if err != nil {
		log.Debug("SyncHandlerV2.SyncStreams: syncLocalNode failed", "err", err)
		subscription.OnSyncError(err)
	}
}

func (s *SyncHandlerV2) syncLocalStreamsImpl(
	ctx context.Context,
	syncPos []*protocol.SyncCookie,
	subscription *syncSubscriptionImpl,
) error {
	if len(syncPos) <= 0 {
		return nil
	}

	defer func() {
		subscription.unsubAllLocalStreams()
	}()

	if err := s.addLocalStreamsToSync(ctx, syncPos, subscription); err != nil {
		return err
	}

	// Wait for context to be done before unsubbing.
	<-ctx.Done()
	return nil
}

func (s *SyncHandlerV2) addLocalStreamsToSync(
	ctx context.Context,
	syncPos []*protocol.SyncCookie,
	subscription *syncSubscriptionImpl,
) error {
	for _, pos := range syncPos {
		if ctx.Err() != nil {
			return ctx.Err()
		}

		err := events.SyncCookieValidate(pos)
		if err != nil {
			return nil
		}

		if subscription.existsLocalStreamId(pos.StreamId) {
			// stream is already subscribed. skip to the next cookie.
			continue
		}

		streamSub, _, err := s.cache.GetStream(ctx, pos.StreamId)
		if err != nil {
			return err
		}

		err = subscription.addLocalStream(ctx, pos, &streamSub)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *SyncHandlerV2) AddStreamsToSync(
	ctx context.Context,
	req *connect_go.Request[protocol.AddStreamsToSyncRequest],
) (*connect_go.Response[protocol.AddStreamsToSyncResponse], error) {
	var subscription *syncSubscriptionImpl
	if subscription = s.syncIdToSubscription[req.Msg.SyncId]; subscription == nil {
		return nil, base.RiverError(protocol.Err_NOT_FOUND, "SyncId not found").Func("AddStreamsToSync")
	}

	localCookies, remoteCookies := s.getLocalAndRemoteCookies(req.Msg.SyncPos)
	addedRemoteNodes := make([]*syncNode, 0, 8)

	for _, cookie := range remoteCookies {
		nodeAddr := cookie.NodeAddress
		if subscription.existsRemoteAddress(nodeAddr) {
			stub, err := s.nodeRegistry.GetRemoteStubForAddress(nodeAddr)
			if err != nil {
				// TODO: Handle the case when node is no longer available.
				return nil, err
			}
			if stub == nil {
				panic("stub always should set for the remote node")
			}

			r := &syncNode{
				syncPos: []*protocol.SyncCookie{},
				stub:    stub,
			}
			if subscription.addRemoteNode(nodeAddr, r) {
				addedRemoteNodes = append(addedRemoteNodes, r)
			}
		}
		remote := subscription.remoteNodes[nodeAddr]
		remote.syncPos = append(remote.syncPos, cookie)
	}

	if len(localCookies) > 0 {
		if err := s.addLocalStreamsToSync(ctx, localCookies, subscription); err != nil {
			return nil, err
		}
	}

	// start the sync loop for the newly added remote nodes
	for _, remote := range addedRemoteNodes {
		go remote.syncRemoteNode(ctx, subscription)
	}

	return connect_go.NewResponse(&protocol.AddStreamsToSyncResponse{}), nil
}

func (s *SyncHandlerV2) RemoveStreamsFromSync(
	ctx context.Context,
	req *connect_go.Request[protocol.RemoveStreamsFromSyncRequest],
) (*connect_go.Response[protocol.RemoveStreamsFromSyncResponse], error) {
	return nil, base.RiverError(protocol.Err_UNIMPLEMENTED, "Not Implemented").Func("RemoveStreamsFromSync")
}

func (s *SyncHandlerV2) AddSubscription(
	ctx context.Context,
	req *connect_go.Request[protocol.SyncStreamsRequest],
	res *connect_go.ServerStream[protocol.SyncStreamsResponse],
	syncId string,
) (*syncSubscriptionImpl, error) {
	log := dlog.CtxLog(ctx)
	s.syncLock.Lock()
	defer s.syncLock.Unlock()
	if s.syncIdToSubscription == nil {
		s.syncIdToSubscription = make(map[string]*syncSubscriptionImpl)
	}
	if _, ok := s.syncIdToSubscription[syncId]; ok {
		return nil, errors.New("syncId subscription already exists")
	}
	syncCtx, cancelSync := context.WithCancel(ctx)
	subscription := &syncSubscriptionImpl{
		SyncId:       syncId,
		ctx:          syncCtx,
		cancel:       cancelSync,
		localStreams: make(map[string]*events.SyncStream),
		remoteNodes:  make(map[string]*syncNode),
		syncResponse: res,
		channel:      make(chan *protocol.SyncStreamsResponse),
	}
	s.syncIdToSubscription[syncId] = subscription
	log.Info("AddSubscription: syncId subscription added", "syncId", syncId)
	return subscription, nil
}

func (s *SyncHandlerV2) RemoveSubscription(
	ctx context.Context,
	syncId string,
) {
	log := dlog.CtxLog(ctx)
	s.syncLock.Lock()
	defer s.syncLock.Unlock()
	subscription := s.syncIdToSubscription[syncId]
	if subscription != nil {
		subscription.close()
		delete(s.syncIdToSubscription, syncId)
	}
	log.Info("RemoveSubscription: syncId subscription removed", "syncId", syncId)
}

func (s *SyncHandlerV2) ResetSubscriptions() {
	// todo
}

func (s *SyncHandlerV1) SyncStreams(
	ctx context.Context,
	req *connect_go.Request[protocol.SyncStreamsRequest],
	res *connect_go.ServerStream[protocol.SyncStreamsResponse],
) error {
	ctx, log := ctxAndLogForRequest(ctx, req)
	log.Debug("SyncStreams ENTER", "syncPos", req.Msg.SyncPos)
	e := s.syncStreamsImpl(ctx, req, res)
	if e != nil {
		err := base.AsRiverError(e).Func("SyncStreams")
		if err.Code == protocol.Err_CANCELED {
			// Context is canceled when client disconnects, so this is normal case.
			_ = err.LogDebug(log)
		} else {
			_ = err.LogWarn(log)
		}
		return err.AsConnectError()
	}
	log.Debug("SyncStreams LEAVE")
	return nil
}

func (s *SyncHandlerV1) AddStreamsToSync(
	ctx context.Context,
	req *connect_go.Request[protocol.AddStreamsToSyncRequest],
) (*connect_go.Response[protocol.AddStreamsToSyncResponse], error) {
	return nil, base.RiverError(protocol.Err_UNIMPLEMENTED, "Not Implemented").Func("AddStreamsToSync")
}

func (s *SyncHandlerV1) RemoveStreamsFromSync(
	ctx context.Context,
	req *connect_go.Request[protocol.RemoveStreamsFromSyncRequest],
) (*connect_go.Response[protocol.RemoveStreamsFromSyncResponse], error) {
	return nil, base.RiverError(protocol.Err_UNIMPLEMENTED, "Not Implemented").Func("RemoveStreamsFromSync")
}

func (s *SyncHandlerV1) syncStreamsImpl(
	ctx context.Context,
	req *connect_go.Request[protocol.SyncStreamsRequest],
	res *connect_go.ServerStream[protocol.SyncStreamsResponse],
) error {
	log := dlog.CtxLog(ctx)

	local := make([]*protocol.SyncCookie, 0, 8)
	localNodeAddress := s.wallet.AddressStr

	remotes := make(map[string]*syncNode)
	defer func() {
		for _, remote := range remotes {
			remote.close()
		}
	}()

	for _, cookie := range req.Msg.SyncPos {
		nodeAddr := cookie.NodeAddress
		if cookie.NodeAddress == localNodeAddress {
			local = append(local, cookie)
		} else {
			remote, ok := remotes[nodeAddr]
			if !ok {
				stub, err := s.nodeRegistry.GetRemoteStubForAddress(nodeAddr)
				if err != nil {
					// TODO: Handle the case when node is no longer available.
					return err
				}
				if stub == nil {
					panic("stub always should set for the remote node")
				}

				remote = &syncNode{
					syncPos: []*protocol.SyncCookie{cookie},
					stub:    stub,
				}
				remotes[nodeAddr] = remote
			} else {
				remote.syncPos = append(remote.syncPos, cookie)
			}
		}
	}

	syncCtx, cancelSync := context.WithCancel(ctx)

	receiver := &syncReceiver{
		ctx:     syncCtx,
		cancel:  cancelSync,
		channel: make(chan *protocol.SyncStreamsResponse, 128),
	}

	if len(local) > 0 {
		go s.syncLocalNode(syncCtx, local, receiver)
	}

	for _, remote := range remotes {
		go remote.syncRemoteNode(syncCtx, receiver)
	}

	receiver.Dispatch(res)

	err := receiver.getError()
	if err != nil {
		return err
	}

	log.Error("SyncStreams: sync always should be terminated by context cancel.")
	return nil
}

func (s *SyncHandlerV1) syncLocalStreamsImpl(ctx context.Context, syncPos []*protocol.SyncCookie, receiver events.SyncResultReceiver) error {
	if len(syncPos) <= 0 {
		return nil
	}

	subs := make([]events.SyncStream, 0, len(syncPos))
	defer func() {
		for _, sub := range subs {
			sub.Unsub(receiver)
		}
	}()

	for _, pos := range syncPos {
		if ctx.Err() != nil {
			return ctx.Err()
		}

		err := events.SyncCookieValidate(pos)
		if err != nil {
			return nil
		}

		streamSub, _, err := s.cache.GetStream(ctx, pos.StreamId)
		if err != nil {
			return err
		}

		err = streamSub.Sub(ctx, pos, receiver)
		if err != nil {
			return err
		}
		subs = append(subs, streamSub)
	}

	// Wait for context to be done before unsubbing.
	<-ctx.Done()
	return nil
}

func (s *SyncHandlerV1) syncLocalNode(ctx context.Context, syncPos []*protocol.SyncCookie, receiver events.SyncResultReceiver) {
	log := dlog.CtxLog(ctx)

	if ctx.Err() != nil {
		log.Debug("SyncStreams: syncLocalNode not starting", "context_error", ctx.Err())
		return
	}

	err := s.syncLocalStreamsImpl(ctx, syncPos, receiver)
	if err != nil {
		log.Debug("SyncStreams: syncLocalNode failed", "err", err)
		receiver.OnSyncError(err)
	}
}

// TODO: connect-go is not using channels for streaming (>_<), so it's a bit tricky to close all these
// streams properly. For now basic protocol is to close entire sync if there is any error.
// Which in turn means that we need to close all outstanding streams to remote nodes.
// Without control signals there is no clean way to do so, so for now both ctx is canceled and Close is called
// async hoping this will trigger Receive to abort.
func (n *syncNode) syncRemoteNode(ctx context.Context, receiver events.SyncResultReceiver) {
	log := dlog.CtxLog(ctx)
	if ctx.Err() != nil || n.isClosed() {
		log.Debug("SyncStreams: syncRemoteNode not starting", "context_error", ctx.Err())
		return
	}

	stream, err := n.stub.SyncStreams(
		ctx,
		&connect_go.Request[protocol.SyncStreamsRequest]{
			Msg: &protocol.SyncStreamsRequest{
				SyncPos: n.syncPos,
			},
		},
	)
	if err != nil {
		log.Debug("SyncStreams: syncRemoteNode remote SyncStreams failed", "err", err)
		receiver.OnSyncError(err)
		return
	}

	if !n.setStream(stream) {
		log.Debug("SyncStreams: syncRemoteNode already closed")
		// means that n.close() was already called.
		stream.Close()
		return
	}

	if ctx.Err() != nil {
		log.Debug("SyncStreams: syncRemoteNode not receiving", "context_error", ctx.Err())
		return
	}

	for stream.Receive() {
		if ctx.Err() != nil || n.isClosed() {
			log.Debug("SyncStreams: syncRemoteNode receive canceled", "context_error", ctx.Err())
			return
		}

		log.Debug("SyncStreams: syncRemoteNode received update", "resp", stream.Msg())

		receiver.OnUpdate(stream.Msg())
	}

	if ctx.Err() != nil || n.isClosed() {
		return
	}

	if err := stream.Err(); err != nil {
		log.Debug("SyncStreams: syncRemoteNode receive failed", "err", err)
		receiver.OnSyncError(err)
		return
	}
}

func (n *syncNode) setStream(stream *connect_go.ServerStreamForClient[protocol.SyncStreamsResponse]) bool {
	n.mu.Lock()
	defer n.mu.Unlock()
	if !n.closed {
		n.stream = stream
		return true
	} else {
		return false
	}
}

func (n *syncNode) isClosed() bool {
	n.mu.Lock()
	defer n.mu.Unlock()
	return n.closed
}

func (n *syncNode) close() {
	n.mu.Lock()
	defer n.mu.Unlock()
	if !n.closed {
		n.closed = true
		if n.stream != nil {
			n.stream.Close()
		}
	}
}
