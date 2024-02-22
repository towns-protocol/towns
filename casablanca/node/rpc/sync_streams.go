package rpc

import (
	"context"
	"errors"
	"sync"

	"connectrpc.com/connect"
	"github.com/river-build/river/base"
	"github.com/river-build/river/crypto"
	"github.com/river-build/river/dlog"
	"github.com/river-build/river/events"
	"github.com/river-build/river/nodes"
	"github.com/river-build/river/protocol"
	"github.com/river-build/river/protocol/protocolconnect"

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
	wallet *crypto.Wallet,
	cache events.StreamCache,
	nodeRegistry nodes.NodeRegistry,
	streamRegistry nodes.StreamRegistry,
) SyncHandler {
	return &syncHandlerImpl{
		wallet:               wallet,
		cache:                cache,
		nodeRegistry:         nodeRegistry,
		streamRegistry:       streamRegistry,
		mu:                   sync.Mutex{},
		syncIdToSubscription: make(map[string]*syncSubscriptionImpl),
	}
}

type SyncHandler interface {
	SyncStreams(
		ctx context.Context,
		req *connect.Request[protocol.SyncStreamsRequest],
		res *connect.ServerStream[protocol.SyncStreamsResponse],
	) error
	AddStreamToSync(
		ctx context.Context,
		req *connect.Request[protocol.AddStreamToSyncRequest],
	) (*connect.Response[protocol.AddStreamToSyncResponse], error)
	RemoveStreamFromSync(
		ctx context.Context,
		req *connect.Request[protocol.RemoveStreamFromSyncRequest],
	) (*connect.Response[protocol.RemoveStreamFromSyncResponse], error)
	CancelSync(
		ctx context.Context,
		req *connect.Request[protocol.CancelSyncRequest],
	) (*connect.Response[protocol.CancelSyncResponse], error)
	PingSync(
		ctx context.Context,
		req *connect.Request[protocol.PingSyncRequest],
	) (*connect.Response[protocol.PingSyncResponse], error)
}

type syncHandlerImpl struct {
	wallet               *crypto.Wallet
	cache                events.StreamCache
	nodeRegistry         nodes.NodeRegistry
	streamRegistry       nodes.StreamRegistry
	mu                   sync.Mutex
	syncIdToSubscription map[string]*syncSubscriptionImpl
}

type syncNode struct {
	address         string
	remoteSyncId    string // the syncId to the remote node's sync subscription
	forwarderSyncId string // the forwarding node's sync Id
	stub            protocolconnect.StreamServiceClient

	mu     sync.Mutex
	stream *connect.ServerStreamForClient[protocol.SyncStreamsResponse]
	closed bool
}

func (s *Service) SyncStreams(
	ctx context.Context,
	req *connect.Request[protocol.SyncStreamsRequest],
	res *connect.ServerStream[protocol.SyncStreamsResponse],
) error {
	return s.syncHandler.SyncStreams(ctx, req, res)
}

func (s *Service) AddStreamToSync(
	ctx context.Context,
	req *connect.Request[protocol.AddStreamToSyncRequest],
) (*connect.Response[protocol.AddStreamToSyncResponse], error) {
	return s.syncHandler.AddStreamToSync(ctx, req)
}

func (s *Service) RemoveStreamFromSync(
	ctx context.Context,
	req *connect.Request[protocol.RemoveStreamFromSyncRequest],
) (*connect.Response[protocol.RemoveStreamFromSyncResponse], error) {
	return s.syncHandler.RemoveStreamFromSync(ctx, req)
}

func (s *Service) CancelSync(
	ctx context.Context,
	req *connect.Request[protocol.CancelSyncRequest],
) (*connect.Response[protocol.CancelSyncResponse], error) {
	return s.syncHandler.CancelSync(ctx, req)
}

func (s *Service) PingSync(
	ctx context.Context,
	req *connect.Request[protocol.PingSyncRequest],
) (*connect.Response[protocol.PingSyncResponse], error) {
	return s.syncHandler.PingSync(ctx, req)
}

func (s *syncHandlerImpl) SyncStreams(
	ctx context.Context,
	req *connect.Request[protocol.SyncStreamsRequest],
	res *connect.ServerStream[protocol.SyncStreamsResponse],
) error {
	ctx, log := ctxAndLogForRequest(ctx, req)

	// generate a random syncId
	syncId := uuid.New().String()
	log.Debug("SyncStreams:SyncHandlerV2.SyncStreams ENTER", "syncId", syncId, "syncPos", req.Msg.SyncPos)

	sub, err := s.addSubscription(ctx, req, res, syncId)
	if err != nil {
		log.Info("SyncStreams:SyncHandlerV2.SyncStreams LEAVE: failed to add subscription", "syncId", syncId, "err", err)
		return err
	}

	// send syncId to client
	e := res.Send(&protocol.SyncStreamsResponse{
		SyncId: syncId,
		SyncOp: protocol.SyncOp_SYNC_NEW,
	})
	if e != nil {
		err := base.AsRiverError(e).Func("SyncStreams")
		log.Info("SyncStreams:SyncHandlerV2.SyncStreams LEAVE: failed to send syncId", "res", res, "err", err, "syncId", syncId)
		return err
	}
	log.Debug("SyncStreams:SyncHandlerV2.SyncStreams: sent syncId", "syncId", syncId)

	e = s.handleSyncRequest(req, res, sub)
	if e != nil {
		err := base.AsRiverError(e).Func("SyncStreams")
		if err.Code == protocol.Err_CANCELED {
			// Context is canceled when client disconnects, so this is normal case.
			log.Debug("SyncStreams:SyncHandlerV2.SyncStreams LEAVE: sync Dispatch() ended with expected error", "syncId", syncId)
			_ = err.LogDebug(log)
		} else {
			log.Info("SyncStreams:SyncHandlerV2.SyncStreams LEAVE: sync Dispatch() ended with unexpected error", "syncId", syncId)
			_ = err.LogWarn(log)
		}
		return err.AsConnectError()
	}
	// no errors from handling the sync request.
	log.Debug("SyncStreams:SyncHandlerV2.SyncStreams LEAVE")
	return nil
}

func (s *syncHandlerImpl) handleSyncRequest(
	req *connect.Request[protocol.SyncStreamsRequest],
	res *connect.ServerStream[protocol.SyncStreamsResponse],
	sub *syncSubscriptionImpl,
) error {
	if sub == nil {
		return base.RiverError(protocol.Err_NOT_FOUND, "SyncId not found").Func("SyncStreams")
	}
	log := dlog.FromCtx(sub.ctx)

	defer func() {
		s.removeSubscription(sub.ctx, sub.syncId)
	}()

	localCookies, remoteCookies := getLocalAndRemoteCookies(s.wallet.AddressStr, req.Msg.SyncPos)

	for nodeAddr, remoteCookie := range remoteCookies {
		var r *syncNode
		if r = sub.getRemoteNode(nodeAddr); r == nil {
			stub, err := s.nodeRegistry.GetStreamServiceClientForAddress(nodeAddr)
			if err != nil {
				// TODO: Handle the case when node is no longer available. HNT-4715
				log.Error(
					"SyncStreams:SyncHandlerV2.SyncStreams failed to get stream service client",
					"syncId",
					sub.syncId,
					"err",
					err,
				)
				return err
			}

			r = &syncNode{
				address:         nodeAddr,
				forwarderSyncId: sub.syncId,
				stub:            stub,
			}
		}
		sub.addSyncNode(r, remoteCookie)
	}

	if len(localCookies) > 0 {
		go s.syncLocalNode(sub.ctx, localCookies, sub)
	}

	remotes := sub.getRemoteNodes()
	for _, remote := range remotes {
		cookies := remoteCookies[remote.address]
		go remote.syncRemoteNode(sub.ctx, sub.syncId, cookies, sub)
	}

	// start the sync loop
	log.Debug("SyncStreams:SyncHandlerV2.SyncStreams: sync Dispatch() started", "syncId", sub.syncId)
	sub.Dispatch(res)
	log.Debug("SyncStreams:SyncHandlerV2.SyncStreams: sync Dispatch() ended", "syncId", sub.syncId)

	err := sub.getError()
	if err != nil {
		log.Debug("SyncStreams:SyncHandlerV2.SyncStreams LEAVE: sync Dispatch() ended with expected error", "syncId", sub.syncId)
		return err
	}

	log.Error("SyncStreams:SyncStreams: sync always should be terminated by context cancel.")
	return nil
}

func (s *syncHandlerImpl) CancelSync(
	ctx context.Context,
	req *connect.Request[protocol.CancelSyncRequest],
) (*connect.Response[protocol.CancelSyncResponse], error) {
	_, log := ctxAndLogForRequest(ctx, req)
	log.Debug("SyncStreams:SyncHandlerV2.CancelSync ENTER", "syncId", req.Msg.SyncId)
	sub := s.getSub(req.Msg.SyncId)
	if sub != nil {
		sub.OnClose()
	}
	log.Debug("SyncStreams:SyncHandlerV2.CancelSync LEAVE", "syncId", req.Msg.SyncId)
	return connect.NewResponse(&protocol.CancelSyncResponse{}), nil
}

func (s *syncHandlerImpl) PingSync(
	ctx context.Context,
	req *connect.Request[protocol.PingSyncRequest],
) (*connect.Response[protocol.PingSyncResponse], error) {
	_, log := ctxAndLogForRequest(ctx, req)
	syncId := req.Msg.SyncId

	sub := s.getSub(syncId)
	if sub == nil {
		log.Debug("SyncStreams: ping sync", "syncId", syncId)
		return nil, base.RiverError(protocol.Err_NOT_FOUND, "SyncId not found").Func("PingSync")
	}

	// cancel if context is done
	if sub.ctx.Err() != nil {
		log.Debug("SyncStreams: ping sync", "syncId", syncId, "context_error", sub.ctx.Err())
		return nil, base.RiverError(protocol.Err_CANCELED, "SyncId canceled").Func("PingSync")
	}

	log.Debug("SyncStreams: ping sync", "syncId", syncId)
	c := pingOp{
		baseSyncOp: baseSyncOp{op: protocol.SyncOp_SYNC_PONG},
		nonce:      req.Msg.Nonce,
	}
	select {
	// send the pong response to the client via the control channel
	case sub.controlChannel <- &c:
		return connect.NewResponse(&protocol.PingSyncResponse{}), nil
	default:
		return nil, base.RiverError(protocol.Err_BUFFER_FULL, "control channel full").Func("PingSync")
	}
}

func getLocalAndRemoteCookies(
	localWalletAddr string,
	syncCookies []*protocol.SyncCookie,
) (localCookies []*protocol.SyncCookie, remoteCookies map[string][]*protocol.SyncCookie) {
	localCookies = make([]*protocol.SyncCookie, 0, 8)
	remoteCookies = make(map[string][]*protocol.SyncCookie)
	for _, cookie := range syncCookies {
		if cookie.NodeAddress == localWalletAddr {
			localCookies = append(localCookies, cookie)
		} else {
			if remoteCookies[cookie.NodeAddress] == nil {
				remoteCookies[cookie.NodeAddress] = make([]*protocol.SyncCookie, 0, 8)
			}
			remoteCookies[cookie.NodeAddress] = append(remoteCookies[cookie.NodeAddress], cookie)
		}
	}
	return
}

func (s *syncHandlerImpl) syncLocalNode(
	ctx context.Context,
	syncPos []*protocol.SyncCookie,
	sub *syncSubscriptionImpl,
) {
	log := dlog.FromCtx(ctx)

	if ctx.Err() != nil {
		log.Error("SyncStreams:SyncHandlerV2.SyncStreams: syncLocalNode not starting", "context_error", ctx.Err())
		return
	}

	err := s.syncLocalStreamsImpl(ctx, syncPos, sub)
	if err != nil {
		log.Error("SyncStreams:SyncHandlerV2.SyncStreams: syncLocalNode failed", "err", err)
		if sub != nil {
			sub.OnSyncError(err)
		}
	}
}

func (s *syncHandlerImpl) syncLocalStreamsImpl(
	ctx context.Context,
	syncPos []*protocol.SyncCookie,
	sub *syncSubscriptionImpl,
) error {
	if len(syncPos) <= 0 {
		return nil
	}

	defer func() {
		if sub != nil {
			sub.unsubLocalStreams()
		}
	}()

	for _, pos := range syncPos {
		if ctx.Err() != nil {
			return ctx.Err()
		}

		err := s.addLocalStreamToSync(ctx, pos, sub)
		if err != nil {
			return err
		}
	}

	// Wait for context to be done before unsubbing.
	<-ctx.Done()
	return nil
}

func (s *syncHandlerImpl) addLocalStreamToSync(
	ctx context.Context,
	cookie *protocol.SyncCookie,
	subs *syncSubscriptionImpl,
) error {
	log := dlog.FromCtx(ctx)
	log.Debug("SyncStreams:SyncHandlerV2.addLocalStreamToSync ENTER", "syncId", subs.syncId, "syncPos", cookie)

	if ctx.Err() != nil {
		log.Error("SyncStreams:SyncHandlerV2.addLocalStreamToSync: context error", "err", ctx.Err())
		return ctx.Err()
	}
	if subs == nil {
		return base.RiverError(protocol.Err_NOT_FOUND, "SyncId not found").Func("SyncStreams")
	}

	err := events.SyncCookieValidate(cookie)
	if err != nil {
		log.Debug("SyncStreams:SyncHandlerV2.addLocalStreamToSync: invalid cookie", "err", err)
		return nil
	}

	if s := subs.getLocalStream(cookie.StreamId); s != nil {
		// stream is already subscribed. no need to re-subscribe.
		log.Debug("SyncStreams:SyncHandlerV2.addLocalStreamToSync: stream already subscribed", "streamId", cookie.StreamId)
		return nil
	}

	streamSub, _, err := s.cache.GetStream(ctx, cookie.StreamId)
	if err != nil {
		log.Info("SyncStreams:SyncHandlerV2.addLocalStreamToSync: failed to get stream", "streamId", cookie.StreamId, "err", err)
		return err
	}

	err = subs.addLocalStream(ctx, cookie, &streamSub)
	if err != nil {
		log.Info(
			"SyncStreams:SyncHandlerV2.addLocalStreamToSync: error subscribing to stream",
			"streamId",
			cookie.StreamId,
			"err",
			err,
		)
		return err
	}

	log.Debug("SyncStreams:SyncHandlerV2.addLocalStreamToSync LEAVE", "syncId", subs.syncId, "streamId", cookie.StreamId)
	return nil
}

func (s *syncHandlerImpl) AddStreamToSync(
	ctx context.Context,
	req *connect.Request[protocol.AddStreamToSyncRequest],
) (*connect.Response[protocol.AddStreamToSyncResponse], error) {
	ctx, log := ctxAndLogForRequest(ctx, req)
	log.Debug("SyncStreams:SyncHandlerV2.AddStreamToSync ENTER", "syncId", req.Msg.SyncId, "syncPos", req.Msg.SyncPos)

	syncId := req.Msg.SyncId
	cookie := req.Msg.SyncPos

	log.Debug("SyncStreams:SyncHandlerV2.AddStreamToSync: getting sub", "syncId", syncId)
	sub := s.getSub(syncId)
	if sub == nil {
		log.Info("SyncStreams:SyncHandlerV2.AddStreamToSync LEAVE: SyncId not found", "syncId", syncId)
		return nil, base.RiverError(protocol.Err_NOT_FOUND, "SyncId not found").Func("AddStreamToSync")
	}
	log.Debug("SyncStreams:SyncHandlerV2.AddStreamToSync: got sub", "syncId", syncId)

	// Two cases to handle. Either local cookie or remote cookie.
	if cookie.NodeAddress == s.wallet.AddressStr {
		// Case 1: local cookie
		if err := s.addLocalStreamToSync(ctx, cookie, sub); err != nil {
			log.Info("SyncStreams:SyncHandlerV2.AddStreamToSync LEAVE: failed to add local streams", "syncId", syncId, "err", err)
			return nil, err
		}
		// done.
		log.Debug("SyncStreams:SyncHandlerV2.AddStreamToSync: LEAVE", "syncId", syncId)
		return connect.NewResponse(&protocol.AddStreamToSyncResponse{}), nil
	}

	// Case 2: remote cookie
	log.Debug("SyncStreams:SyncHandlerV2.AddStreamToSync: adding remote streams", "syncId", syncId)
	remoteNode := sub.getRemoteNode(cookie.NodeAddress)
	isNewRemoteNode := remoteNode == nil
	log.Debug("SyncStreams:SyncHandlerV2.AddStreamToSync: remote node", "syncId", syncId, "isNewRemoteNode", isNewRemoteNode)
	if isNewRemoteNode {
		// the remote node does not exist in the subscription. add it.
		stub, err := s.nodeRegistry.GetStreamServiceClientForAddress(cookie.NodeAddress)
		if err != nil {
			log.Info(
				"SyncStreams:SyncHandlerV2.AddStreamToSync: failed to get stream service client",
				"syncId",
				req.Msg.SyncId,
				"err",
				err,
			)
			// TODO: Handle the case when node is no longer available.
			return nil, err
		}
		if stub == nil {
			panic("stub always should set for the remote node")
		}

		remoteNode = &syncNode{
			address:         cookie.NodeAddress,
			forwarderSyncId: sub.syncId,
			stub:            stub,
		}
		sub.addRemoteNode(cookie.NodeAddress, remoteNode)
		log.Info("SyncStreams:SyncHandlerV2.AddStreamToSync: added remote node", "syncId", req.Msg.SyncId)
	}
	sub.addRemoteStream(cookie)
	log.Info("SyncStreams:SyncHandlerV2.AddStreamToSync: added remote stream", "syncId", req.Msg.SyncId)

	if isNewRemoteNode {
		// tell the new remote node to sync
		syncPos := make([]*protocol.SyncCookie, 0, 1)
		syncPos = append(syncPos, cookie)
		log.Info("SyncStreams:SyncHandlerV2.AddStreamToSync: syncing new remote node", "syncId", req.Msg.SyncId)
		go remoteNode.syncRemoteNode(sub.ctx, sub.syncId, syncPos, sub)
	} else {
		log.Info("SyncStreams:SyncHandlerV2.AddStreamToSync: adding stream to existing remote node", "syncId", req.Msg.SyncId)
		// tell the existing remote nodes to add the streams to sync
		go remoteNode.addStreamToSync(sub.ctx, cookie, sub)
	}

	log.Debug("SyncStreams:SyncHandlerV2.AddStreamToSync LEAVE", "syncId", req.Msg.SyncId)
	return connect.NewResponse(&protocol.AddStreamToSyncResponse{}), nil
}

func (s *syncHandlerImpl) RemoveStreamFromSync(
	ctx context.Context,
	req *connect.Request[protocol.RemoveStreamFromSyncRequest],
) (*connect.Response[protocol.RemoveStreamFromSyncResponse], error) {
	_, log := ctxAndLogForRequest(ctx, req)
	log.Info("SyncStreams:SyncHandlerV2.RemoveStreamFromSync ENTER", "syncId", req.Msg.SyncId, "streamId", req.Msg.StreamId)

	syncId := req.Msg.SyncId
	streamId := req.Msg.StreamId

	sub := s.getSub(syncId)
	if sub == nil {
		log.Info("SyncStreams:SyncHandlerV2.RemoveStreamFromSync LEAVE: SyncId not found", "syncId", syncId)
		return nil, base.RiverError(protocol.Err_NOT_FOUND, "SyncId not found").Func("RemoveStreamFromSync")
	}

	// remove the streamId from the local node
	sub.removeLocalStream(streamId)

	// use the streamId to find the remote node to remove
	remoteNode := sub.removeRemoteStream(streamId)
	if remoteNode != nil {
		log.Debug("SyncStreams:SyncHandlerV2.RemoveStreamFromSync: removing remote stream", "syncId", syncId, "streamId", streamId)
		err := remoteNode.removeStreamFromSync(sub.ctx, streamId, sub)
		if err != nil {
			log.Info(
				"SyncStreams:SyncHandlerV2.RemoveStreamFromSync: failed to remove remote stream",
				"syncId",
				syncId,
				"streamId",
				streamId,
				"err",
				err,
			)
			return nil, err
		}
		// remove any remote nodes that no longer have any streams to sync
		sub.purgeUnusedRemoteNodes(log)
	}

	log.Info("SyncStreams:SyncHandlerV2.RemoveStreamFromSync LEAVE", "syncId", syncId)
	return connect.NewResponse(&protocol.RemoveStreamFromSyncResponse{}), nil
}

func (s *syncHandlerImpl) addSubscription(
	ctx context.Context,
	req *connect.Request[protocol.SyncStreamsRequest],
	res *connect.ServerStream[protocol.SyncStreamsResponse],
	syncId string,
) (*syncSubscriptionImpl, error) {
	log := dlog.FromCtx(ctx)
	s.mu.Lock()
	defer func() {
		s.mu.Unlock()
	}()
	if s.syncIdToSubscription == nil {
		s.syncIdToSubscription = make(map[string]*syncSubscriptionImpl)
	}
	if sub := s.syncIdToSubscription[syncId]; sub != nil {
		return nil, errors.New("syncId subscription already exists")
	}
	syncCtx, cancelSync := context.WithCancel(ctx)
	sub := &syncSubscriptionImpl{
		syncId:         syncId,
		ctx:            syncCtx,
		cancel:         cancelSync,
		localStreams:   make(map[string]*events.SyncStream),
		remoteNodes:    make(map[string]*syncNode),
		remoteStreams:  make(map[string]*syncNode),
		dataChannel:    make(chan *protocol.StreamAndCookie, 128),
		controlChannel: make(chan syncOp, 64),
	}
	s.syncIdToSubscription[syncId] = sub
	log.Debug("SyncStreams:addSubscription: syncId subscription added", "syncId", syncId)
	return sub, nil
}

func (s *syncHandlerImpl) removeSubscription(
	ctx context.Context,
	syncId string,
) {
	log := dlog.FromCtx(ctx)
	sub := s.getSub(syncId)
	if sub != nil {
		sub.deleteRemoteNodes()
	}
	s.mu.Lock()
	if _, exists := s.syncIdToSubscription[syncId]; exists {
		delete(s.syncIdToSubscription, syncId)
		log.Debug("SyncStreams:removeSubscription: syncId subscription removed", "syncId", syncId)
	} else {
		log.Debug("SyncStreams:removeSubscription: syncId not found", "syncId", syncId)
	}
	s.mu.Unlock()
}

func (s *syncHandlerImpl) getSub(
	syncId string,
) *syncSubscriptionImpl {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.syncIdToSubscription[syncId]
}

// TODO: connect-go is not using channels for streaming (>_<), so it's a bit tricky to close all these
// streams properly. For now basic protocol is to close entire sync if there is any error.
// Which in turn means that we need to close all outstanding streams to remote nodes.
// Without control signals there is no clean way to do so, so for now both ctx is canceled and Close is called
// async hoping this will trigger Receive to abort.
func (n *syncNode) syncRemoteNode(
	ctx context.Context,
	forwarderSyncId string,
	syncPos []*protocol.SyncCookie,
	receiver events.SyncResultReceiver,
) {
	log := dlog.FromCtx(ctx)
	if ctx.Err() != nil || n.isClosed() {
		log.Debug("SyncStreams: syncRemoteNode not started", "context_error", ctx.Err())
		return
	}
	if n.remoteSyncId != "" {
		log.Debug(
			"SyncStreams: syncRemoteNode not started because there is an existing sync",
			"remoteSyncId",
			n.remoteSyncId,
			"forwarderSyncId",
			forwarderSyncId,
		)
		return
	}

	defer func() {
		if n != nil {
			n.close()
		}
	}()

	responseStream, err := n.stub.SyncStreams(
		ctx,
		&connect.Request[protocol.SyncStreamsRequest]{
			Msg: &protocol.SyncStreamsRequest{
				SyncPos: syncPos,
			},
		},
	)
	if err != nil {
		log.Debug("SyncStreams: syncRemoteNode remote SyncStreams failed", "err", err)
		receiver.OnSyncError(err)
		return
	}

	if !responseStream.Receive() {
		receiver.OnSyncError(responseStream.Err())
		return
	}

	if responseStream.Msg().SyncOp != protocol.SyncOp_SYNC_NEW || responseStream.Msg().SyncId == "" {
		receiver.OnSyncError(base.RiverError(protocol.Err_INTERNAL, "first sync response should be SYNC_NEW and have SyncId").Func("syncRemoteNode"))
		return
	}

	n.remoteSyncId = responseStream.Msg().SyncId
	n.forwarderSyncId = forwarderSyncId

	if !n.setStream(responseStream) {
		log.Debug("SyncStreams: syncRemoteNode already closed")
		// means that n.close() was already called.
		responseStream.Close()
		return
	}

	if ctx.Err() != nil {
		log.Debug("SyncStreams: syncRemoteNode not receiving", "context_error", ctx.Err())
		return
	}

	for responseStream.Receive() {
		if ctx.Err() != nil || n.isClosed() {
			log.Debug("SyncStreams: syncRemoteNode receive canceled", "context_error", ctx.Err())
			return
		}

		log.Debug("SyncStreams: syncRemoteNode received update", "resp", responseStream.Msg())

		receiver.OnUpdate(responseStream.Msg().GetStream())
	}

	if ctx.Err() != nil || n.isClosed() {
		return
	}

	if err := responseStream.Err(); err != nil {
		log.Debug("SyncStreams: syncRemoteNode receive failed", "err", err)
		receiver.OnSyncError(err)
		return
	}
}

func (n *syncNode) addStreamToSync(
	ctx context.Context,
	cookie *protocol.SyncCookie,
	receiver events.SyncResultReceiver,
) {
	log := dlog.FromCtx(ctx)
	if ctx.Err() != nil || n.isClosed() {
		log.Debug("SyncStreams:syncNode addStreamToSync not started", "context_error", ctx.Err())
	}
	if n.remoteSyncId == "" {
		log.Debug(
			"SyncStreams:syncNode addStreamToSync not started because there is no existing sync",
			"remoteSyncId",
			n.remoteSyncId,
		)
	}

	_, err := n.stub.AddStreamToSync(
		ctx,
		&connect.Request[protocol.AddStreamToSyncRequest]{
			Msg: &protocol.AddStreamToSyncRequest{
				SyncPos: cookie,
				SyncId:  n.remoteSyncId,
			},
		},
	)
	if err != nil {
		log.Debug("SyncStreams:syncNode addStreamToSync failed", "err", err)
		receiver.OnSyncError(err)
	}
}

func (n *syncNode) removeStreamFromSync(
	ctx context.Context,
	streamId string,
	receiver events.SyncResultReceiver,
) error {
	log := dlog.FromCtx(ctx)
	if ctx.Err() != nil || n.isClosed() {
		log.Debug("SyncStreams:syncNode removeStreamsFromSync not started", "context_error", ctx.Err())
		return ctx.Err()
	}
	if n.remoteSyncId == "" {
		log.Debug(
			"SyncStreams:syncNode removeStreamsFromSync not started because there is no existing sync",
			"syncId",
			n.remoteSyncId,
		)
		return nil
	}

	_, err := n.stub.RemoveStreamFromSync(
		ctx,
		&connect.Request[protocol.RemoveStreamFromSyncRequest]{
			Msg: &protocol.RemoveStreamFromSyncRequest{
				SyncId:   n.remoteSyncId,
				StreamId: streamId,
			},
		},
	)
	if err != nil {
		log.Debug("SyncStreams:syncNode removeStreamsFromSync failed", "err", err)
		receiver.OnSyncError(err)
	}
	return err
}

func (n *syncNode) setStream(stream *connect.ServerStreamForClient[protocol.SyncStreamsResponse]) bool {
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
