package rpc

import (
	"bytes"
	"context"
	"errors"
	"sync"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/events"
	"github.com/river-build/river/core/node/nodes"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/protocol/protocolconnect"
	. "github.com/river-build/river/core/node/shared"
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
		req *connect.Request[SyncStreamsRequest],
		res *connect.ServerStream[SyncStreamsResponse],
	) error
	AddStreamToSync(
		ctx context.Context,
		req *connect.Request[AddStreamToSyncRequest],
	) (*connect.Response[AddStreamToSyncResponse], error)
	RemoveStreamFromSync(
		ctx context.Context,
		req *connect.Request[RemoveStreamFromSyncRequest],
	) (*connect.Response[RemoveStreamFromSyncResponse], error)
	CancelSync(
		ctx context.Context,
		req *connect.Request[CancelSyncRequest],
	) (*connect.Response[CancelSyncResponse], error)
	PingSync(
		ctx context.Context,
		req *connect.Request[PingSyncRequest],
	) (*connect.Response[PingSyncResponse], error)
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
	address         common.Address
	remoteSyncId    string // the syncId to the remote node's sync subscription
	forwarderSyncId string // the forwarding node's sync Id
	stub            protocolconnect.StreamServiceClient

	mu     sync.Mutex
	closed bool
}

func (s *Service) SyncStreams(
	ctx context.Context,
	req *connect.Request[SyncStreamsRequest],
	res *connect.ServerStream[SyncStreamsResponse],
) error {
	return s.syncHandler.SyncStreams(ctx, req, res)
}

func (s *Service) AddStreamToSync(
	ctx context.Context,
	req *connect.Request[AddStreamToSyncRequest],
) (*connect.Response[AddStreamToSyncResponse], error) {
	return s.syncHandler.AddStreamToSync(ctx, req)
}

func (s *Service) RemoveStreamFromSync(
	ctx context.Context,
	req *connect.Request[RemoveStreamFromSyncRequest],
) (*connect.Response[RemoveStreamFromSyncResponse], error) {
	return s.syncHandler.RemoveStreamFromSync(ctx, req)
}

func (s *Service) CancelSync(
	ctx context.Context,
	req *connect.Request[CancelSyncRequest],
) (*connect.Response[CancelSyncResponse], error) {
	return s.syncHandler.CancelSync(ctx, req)
}

func (s *Service) PingSync(
	ctx context.Context,
	req *connect.Request[PingSyncRequest],
) (*connect.Response[PingSyncResponse], error) {
	return s.syncHandler.PingSync(ctx, req)
}

func (s *syncHandlerImpl) SyncStreams(
	ctx context.Context,
	req *connect.Request[SyncStreamsRequest],
	res *connect.ServerStream[SyncStreamsResponse],
) error {
	ctx, log := ctxAndLogForRequest(ctx, req)

	// generate a random syncId
	syncId := GenNanoid()
	log.Debug("SyncStreams:SyncHandlerV2.SyncStreams ENTER", "syncId", syncId, "syncPos", req.Msg.SyncPos)

	sub, err := s.addSubscription(ctx, syncId)
	if err != nil {
		log.Info(
			"SyncStreams:SyncHandlerV2.SyncStreams LEAVE: failed to add subscription",
			"syncId",
			syncId,
			"err",
			err,
		)
		return err
	}

	// send syncId to client
	e := res.Send(&SyncStreamsResponse{
		SyncId: syncId,
		SyncOp: SyncOp_SYNC_NEW,
	})
	if e != nil {
		err := AsRiverError(e).Func("SyncStreams")
		log.Info(
			"SyncStreams:SyncHandlerV2.SyncStreams LEAVE: failed to send syncId",
			"res",
			res,
			"err",
			err,
			"syncId",
			syncId,
		)
		return err
	}
	log.Debug("SyncStreams:SyncHandlerV2.SyncStreams: sent syncId", "syncId", syncId)

	e = s.handleSyncRequest(req, res, sub)
	if e != nil {
		err := AsRiverError(e).Func("SyncStreams")
		if err.Code == Err_CANCELED {
			// Context is canceled when client disconnects, so this is normal case.
			log.Debug(
				"SyncStreams:SyncHandlerV2.SyncStreams LEAVE: sync Dispatch() ended with expected error",
				"syncId",
				syncId,
			)
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
	req *connect.Request[SyncStreamsRequest],
	res *connect.ServerStream[SyncStreamsResponse],
	sub *syncSubscriptionImpl,
) error {
	if sub == nil {
		return RiverError(Err_NOT_FOUND, "SyncId not found").Func("SyncStreams")
	}
	log := dlog.FromCtx(sub.ctx)

	defer s.removeSubscription(sub.ctx, sub.syncId)

	localCookies, remoteCookies := getLocalAndRemoteCookies(s.wallet.Address, req.Msg.SyncPos)

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
		err := sub.addSyncNode(r, remoteCookie)
		if err != nil {
			return err
		}
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
		log.Debug(
			"SyncStreams:SyncHandlerV2.SyncStreams LEAVE: sync Dispatch() ended with expected error",
			"syncId",
			sub.syncId,
		)
		return err
	}

	log.Error("SyncStreams:SyncStreams: sync always should be terminated by context cancel.")
	return nil
}

func (s *syncHandlerImpl) CancelSync(
	ctx context.Context,
	req *connect.Request[CancelSyncRequest],
) (*connect.Response[CancelSyncResponse], error) {
	_, log := ctxAndLogForRequest(ctx, req)
	log.Debug("SyncStreams:SyncHandlerV2.CancelSync ENTER", "syncId", req.Msg.SyncId)
	sub := s.getSub(req.Msg.SyncId)
	if sub != nil {
		sub.OnClose()
	}
	log.Debug("SyncStreams:SyncHandlerV2.CancelSync LEAVE", "syncId", req.Msg.SyncId)
	return connect.NewResponse(&CancelSyncResponse{}), nil
}

func (s *syncHandlerImpl) PingSync(
	ctx context.Context,
	req *connect.Request[PingSyncRequest],
) (*connect.Response[PingSyncResponse], error) {
	_, log := ctxAndLogForRequest(ctx, req)
	syncId := req.Msg.SyncId

	sub := s.getSub(syncId)
	if sub == nil {
		log.Debug("SyncStreams: ping sync", "syncId", syncId)
		return nil, RiverError(Err_NOT_FOUND, "SyncId not found").Func("PingSync")
	}

	// cancel if context is done
	if sub.ctx.Err() != nil {
		log.Debug("SyncStreams: ping sync", "syncId", syncId, "context_error", sub.ctx.Err())
		return nil, RiverError(Err_CANCELED, "SyncId canceled").Func("PingSync")
	}

	log.Debug("SyncStreams: ping sync", "syncId", syncId)
	c := pingOp{
		baseSyncOp: baseSyncOp{op: SyncOp_SYNC_PONG},
		nonce:      req.Msg.Nonce,
	}
	select {
	// send the pong response to the client via the control channel
	case sub.controlChannel <- &c:
		return connect.NewResponse(&PingSyncResponse{}), nil
	default:
		return nil, RiverError(Err_BUFFER_FULL, "control channel full").Func("PingSync")
	}
}

func getLocalAndRemoteCookies(
	localWalletAddr common.Address,
	syncCookies []*SyncCookie,
) (localCookies []*SyncCookie, remoteCookies map[common.Address][]*SyncCookie) {
	localCookies = make([]*SyncCookie, 0, 8)
	remoteCookies = make(map[common.Address][]*SyncCookie)
	for _, cookie := range syncCookies {
		if bytes.Equal(cookie.NodeAddress, localWalletAddr[:]) {
			localCookies = append(localCookies, cookie)
		} else {
			remoteAddr := common.BytesToAddress(cookie.NodeAddress)
			if remoteCookies[remoteAddr] == nil {
				remoteCookies[remoteAddr] = make([]*SyncCookie, 0, 8)
			}
			remoteCookies[remoteAddr] = append(remoteCookies[remoteAddr], cookie)
		}
	}
	return
}

func (s *syncHandlerImpl) syncLocalNode(
	ctx context.Context,
	syncPos []*SyncCookie,
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
	syncPos []*SyncCookie,
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
	cookie *SyncCookie,
	subs *syncSubscriptionImpl,
) error {
	log := dlog.FromCtx(ctx)
	log.Debug("SyncStreams:SyncHandlerV2.addLocalStreamToSync ENTER", "syncId", subs.syncId, "syncPos", cookie)

	if ctx.Err() != nil {
		log.Error("SyncStreams:SyncHandlerV2.addLocalStreamToSync: context error", "err", ctx.Err())
		return ctx.Err()
	}
	if subs == nil {
		return RiverError(Err_NOT_FOUND, "SyncId not found").Func("SyncStreams")
	}

	err := events.SyncCookieValidate(cookie)
	if err != nil {
		log.Debug("SyncStreams:SyncHandlerV2.addLocalStreamToSync: invalid cookie", "err", err)
		return nil
	}

	cookieStreamId, err := StreamIdFromBytes(cookie.StreamId)
	if err != nil {
		return err
	}

	if s := subs.getLocalStream(cookieStreamId); s != nil {
		// stream is already subscribed. no need to re-subscribe.
		log.Debug(
			"SyncStreams:SyncHandlerV2.addLocalStreamToSync: stream already subscribed",
			"streamId",
			cookieStreamId,
		)
		return nil
	}

	streamSub, err := s.cache.GetSyncStream(ctx, cookieStreamId)
	if err != nil {
		log.Info(
			"SyncStreams:SyncHandlerV2.addLocalStreamToSync: failed to get stream",
			"streamId",
			cookieStreamId,
			"err",
			err,
		)
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

	log.Debug(
		"SyncStreams:SyncHandlerV2.addLocalStreamToSync LEAVE",
		"syncId",
		subs.syncId,
		"streamId",
		cookie.StreamId,
	)
	return nil
}

func (s *syncHandlerImpl) AddStreamToSync(
	ctx context.Context,
	req *connect.Request[AddStreamToSyncRequest],
) (*connect.Response[AddStreamToSyncResponse], error) {
	ctx, log := ctxAndLogForRequest(ctx, req)
	log.Debug("SyncStreams:SyncHandlerV2.AddStreamToSync ENTER", "syncId", req.Msg.SyncId, "syncPos", req.Msg.SyncPos)

	syncId := req.Msg.SyncId
	cookie := req.Msg.SyncPos

	log.Debug("SyncStreams:SyncHandlerV2.AddStreamToSync: getting sub", "syncId", syncId)
	sub := s.getSub(syncId)
	if sub == nil {
		log.Info("SyncStreams:SyncHandlerV2.AddStreamToSync LEAVE: SyncId not found", "syncId", syncId)
		return nil, RiverError(Err_NOT_FOUND, "SyncId not found").Func("AddStreamToSync")
	}
	log.Debug("SyncStreams:SyncHandlerV2.AddStreamToSync: got sub", "syncId", syncId)

	// Two cases to handle. Either local cookie or remote cookie.
	if bytes.Equal(cookie.NodeAddress[:], s.wallet.Address[:]) {
		// Case 1: local cookie
		if err := s.addLocalStreamToSync(ctx, cookie, sub); err != nil {
			log.Info(
				"SyncStreams:SyncHandlerV2.AddStreamToSync LEAVE: failed to add local streams",
				"syncId",
				syncId,
				"err",
				err,
			)
			return nil, err
		}
		// done.
		log.Debug("SyncStreams:SyncHandlerV2.AddStreamToSync: LEAVE", "syncId", syncId)
		return connect.NewResponse(&AddStreamToSyncResponse{}), nil
	}

	// Case 2: remote cookie
	log.Debug("SyncStreams:SyncHandlerV2.AddStreamToSync: adding remote streams", "syncId", syncId)
	nodeAddress := common.BytesToAddress(cookie.NodeAddress[:])
	remoteNode := sub.getRemoteNode(nodeAddress)
	isNewRemoteNode := remoteNode == nil
	log.Debug(
		"SyncStreams:SyncHandlerV2.AddStreamToSync: remote node",
		"syncId",
		syncId,
		"isNewRemoteNode",
		isNewRemoteNode,
	)
	if isNewRemoteNode {
		// the remote node does not exist in the subscription. add it.
		stub, err := s.nodeRegistry.GetStreamServiceClientForAddress(nodeAddress)
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
			address:         nodeAddress,
			forwarderSyncId: sub.syncId,
			stub:            stub,
		}
		sub.addRemoteNode(nodeAddress, remoteNode)
		log.Info("SyncStreams:SyncHandlerV2.AddStreamToSync: added remote node", "syncId", req.Msg.SyncId)
	}
	err := sub.addRemoteStream(cookie)
	if err != nil {
		log.Info(
			"SyncStreams:SyncHandlerV2.AddStreamToSync LEAVE: failed to add remote streams",
			"syncId",
			req.Msg.SyncId,
			"err",
			err,
		)
		return nil, err
	}
	log.Info("SyncStreams:SyncHandlerV2.AddStreamToSync: added remote stream", "syncId", req.Msg.SyncId)

	if isNewRemoteNode {
		// tell the new remote node to sync
		syncPos := make([]*SyncCookie, 0, 1)
		syncPos = append(syncPos, cookie)
		log.Info("SyncStreams:SyncHandlerV2.AddStreamToSync: syncing new remote node", "syncId", req.Msg.SyncId)
		go remoteNode.syncRemoteNode(sub.ctx, sub.syncId, syncPos, sub)
	} else {
		log.Info("SyncStreams:SyncHandlerV2.AddStreamToSync: adding stream to existing remote node", "syncId", req.Msg.SyncId)
		// tell the existing remote nodes to add the streams to sync
		go remoteNode.addStreamToSync(sub.ctx, cookie, sub)
	}

	log.Debug("SyncStreams:SyncHandlerV2.AddStreamToSync LEAVE", "syncId", req.Msg.SyncId)
	return connect.NewResponse(&AddStreamToSyncResponse{}), nil
}

func (s *syncHandlerImpl) RemoveStreamFromSync(
	ctx context.Context,
	req *connect.Request[RemoveStreamFromSyncRequest],
) (*connect.Response[RemoveStreamFromSyncResponse], error) {
	_, log := ctxAndLogForRequest(ctx, req)
	log.Info(
		"SyncStreams:SyncHandlerV2.RemoveStreamFromSync ENTER",
		"syncId",
		req.Msg.SyncId,
		"streamId",
		req.Msg.StreamId,
	)

	syncId := req.Msg.SyncId
	streamId, err := StreamIdFromBytes(req.Msg.StreamId)
	if err != nil {
		log.Info(
			"SyncStreams:SyncHandlerV2.RemoveStreamFromSync LEAVE: failed to parse streamId",
			"syncId",
			syncId,
			"err",
			err,
		)
		return nil, err
	}

	sub := s.getSub(syncId)
	if sub == nil {
		log.Info("SyncStreams:SyncHandlerV2.RemoveStreamFromSync LEAVE: SyncId not found", "syncId", syncId)
		return nil, RiverError(Err_NOT_FOUND, "SyncId not found").Func("RemoveStreamFromSync")
	}

	// remove the streamId from the local node
	sub.removeLocalStream(streamId)

	// use the streamId to find the remote node to remove
	remoteNode := sub.removeRemoteStream(streamId)
	if remoteNode != nil {
		log.Debug(
			"SyncStreams:SyncHandlerV2.RemoveStreamFromSync: removing remote stream",
			"syncId",
			syncId,
			"streamId",
			streamId,
		)
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
	return connect.NewResponse(&RemoveStreamFromSyncResponse{}), nil
}

func (s *syncHandlerImpl) addSubscription(
	ctx context.Context,
	syncId string,
) (*syncSubscriptionImpl, error) {
	log := dlog.FromCtx(ctx)
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.syncIdToSubscription == nil {
		s.syncIdToSubscription = make(map[string]*syncSubscriptionImpl)
	}
	if sub := s.syncIdToSubscription[syncId]; sub != nil {
		return nil, errors.New("syncId subscription already exists")
	}
	sub := newSyncSubscription(ctx, syncId)
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
	syncPos []*SyncCookie,
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
		&connect.Request[SyncStreamsRequest]{
			Msg: &SyncStreamsRequest{
				SyncPos: syncPos,
			},
		},
	)
	if err != nil {
		log.Debug("SyncStreams: syncRemoteNode remote SyncStreams failed", "err", err)
		receiver.OnSyncError(err)
		return
	}
	defer responseStream.Close()

	if ctx.Err() != nil || n.isClosed() {
		log.Debug("SyncStreams: syncRemoteNode receive canceled", "context_error", ctx.Err())
		return
	}

	if !responseStream.Receive() {
		receiver.OnSyncError(responseStream.Err())
		return
	}

	if responseStream.Msg().SyncOp != SyncOp_SYNC_NEW || responseStream.Msg().SyncId == "" {
		receiver.OnSyncError(
			RiverError(Err_INTERNAL, "first sync response should be SYNC_NEW and have SyncId").Func("syncRemoteNode"),
		)
		return
	}

	n.remoteSyncId = responseStream.Msg().SyncId
	n.forwarderSyncId = forwarderSyncId

	if ctx.Err() != nil || n.isClosed() {
		log.Debug("SyncStreams: syncRemoteNode receive canceled", "context_error", ctx.Err())
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
	cookie *SyncCookie,
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
		&connect.Request[AddStreamToSyncRequest]{
			Msg: &AddStreamToSyncRequest{
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
	streamId StreamId,
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
		&connect.Request[RemoveStreamFromSyncRequest]{
			Msg: &RemoveStreamFromSyncRequest{
				SyncId:   n.remoteSyncId,
				StreamId: streamId[:],
			},
		},
	)
	if err != nil {
		log.Debug("SyncStreams:syncNode removeStreamsFromSync failed", "err", err)
		receiver.OnSyncError(err)
	}
	return err
}

func (n *syncNode) isClosed() bool {
	n.mu.Lock()
	defer n.mu.Unlock()
	return n.closed
}

func (n *syncNode) close() {
	n.mu.Lock()
	defer n.mu.Unlock()
	n.closed = true
}
