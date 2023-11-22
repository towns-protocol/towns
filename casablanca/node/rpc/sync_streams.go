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
	AddStreamToSync(
		ctx context.Context,
		req *connect_go.Request[protocol.AddStreamToSyncRequest],
	) (*connect_go.Response[protocol.AddStreamToSyncResponse], error)
	RemoveStreamFromSync(
		ctx context.Context,
		req *connect_go.Request[protocol.RemoveStreamFromSyncRequest],
	) (*connect_go.Response[protocol.RemoveStreamFromSyncResponse], error)
	RemoveSync(
		ctx context.Context,
		req *connect_go.Request[protocol.RemoveSyncRequest],
	) (*connect_go.Response[protocol.RemoveSyncResponse], error)
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
	address         string
	remoteSyncId    string // the syncId to the remote node's sync subscription
	forwarderSyncId string // the forwarding node's sync Id
	stub            protocolconnect.StreamServiceClient

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

func (s *Service) AddStreamToSync(
	ctx context.Context,
	req *connect_go.Request[protocol.AddStreamToSyncRequest],
) (*connect_go.Response[protocol.AddStreamToSyncResponse], error) {
	return s.syncHandler.AddStreamToSync(ctx, req)
}

func (s *Service) RemoveStreamFromSync(
	ctx context.Context,
	req *connect_go.Request[protocol.RemoveStreamFromSyncRequest],
) (*connect_go.Response[protocol.RemoveStreamFromSyncResponse], error) {
	return s.syncHandler.RemoveStreamFromSync(ctx, req)
}

func (s *Service) RemoveSync(
	ctx context.Context,
	req *connect_go.Request[protocol.RemoveSyncRequest],
) (*connect_go.Response[protocol.RemoveSyncResponse], error) {
	return s.syncHandler.RemoveSync(ctx, req)
}

func (s *SyncHandlerV2) SyncStreams(
	ctx context.Context,
	req *connect_go.Request[protocol.SyncStreamsRequest],
	res *connect_go.ServerStream[protocol.SyncStreamsResponse],
) error {
	ctx, log := ctxAndLogForRequest(ctx, req)
	// generate a random syncId
	syncId := uuid.New().String()
	log.Debug("SyncStreams:SyncHandlerV2.SyncStreams ENTER", "syncId", syncId, "syncPos", req.Msg.SyncPos)
	// return the syncId to the client
	e := res.Send(&protocol.SyncStreamsResponse{
		SyncId: syncId,
	})
	if e != nil {
		err := base.AsRiverError(e).Func("SyncStreams")
		log.Debug("SyncStreams:SyncHandlerV2.SyncStreams: failed to send syncId", "res", res, "err", err, "syncId", syncId)
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
	log.Debug("SyncStreams:SyncHandlerV2.SyncStreams LEAVE")
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

	localCookies, remoteCookies := getLocalAndRemoteCookies(s.wallet.AddressStr, req.Msg.SyncPos)

	for nodeAddr, cookies := range remoteCookies {
		if !subscription.existsRemoteAddress(nodeAddr) {
			stub, err := s.nodeRegistry.GetStreamServiceClientForAddress(nodeAddr)
			if err != nil {
				// TODO: Handle the case when node is no longer available.
				return err
			}

			r := &syncNode{
				address:         nodeAddr,
				forwarderSyncId: syncId,
				stub:            stub,
			}
			subscription.addRemoteNode(nodeAddr, r)
		}
		for _, cookie := range cookies {
			subscription.addRemoteStream(cookie)
		}
	}

	if len(localCookies) > 0 {
		go s.syncLocalNode(ctx, localCookies, subscription)
	}

	for _, remote := range subscription.remoteNodes {
		cookies := remoteCookies[remote.address]
		go remote.syncRemoteNode(ctx, syncId, cookies, subscription)
	}

	// start the sync loop
	subscription.Dispatch(res)

	err = subscription.getError()
	if err != nil {
		return err
	}

	log.Error("SyncStreams:SyncStreams: sync always should be terminated by context cancel.")
	return nil
}

func (s *SyncHandlerV2) RemoveSync(
	ctx context.Context,
	req *connect_go.Request[protocol.RemoveSyncRequest],
) (*connect_go.Response[protocol.RemoveSyncResponse], error) {
	defer func() {
		s.RemoveSubscription(ctx, req.Msg.SyncId)
	}()
	_, log := ctxAndLogForRequest(ctx, req)
	log.Debug("SyncStreams:SyncHandlerV2.RemoveSync", "syncId", req.Msg.SyncId)
	return nil, nil
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

func (s *SyncHandlerV2) syncLocalNode(
	ctx context.Context,
	syncPos []*protocol.SyncCookie,
	subscription *syncSubscriptionImpl,
) {
	log := dlog.CtxLog(ctx)

	if ctx.Err() != nil {
		log.Debug("SyncStreams:SyncHandlerV2.SyncStreams: syncLocalNode not starting", "context_error", ctx.Err())
		return
	}

	err := s.syncLocalStreamsImpl(ctx, syncPos, subscription)
	if err != nil {
		log.Debug("SyncStreams:SyncHandlerV2.SyncStreams: syncLocalNode failed", "err", err)
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

	for _, pos := range syncPos {
		if ctx.Err() != nil {
			return ctx.Err()
		}

		err := s.addLocalStreamToSync(ctx, pos, subscription)
		if err != nil {
			return err
		}
	}

	// Wait for context to be done before unsubbing.
	<-ctx.Done()
	return nil
}

func (s *SyncHandlerV2) addLocalStreamToSync(
	ctx context.Context,
	cookie *protocol.SyncCookie,
	subscription *syncSubscriptionImpl,
) error {
	if ctx.Err() != nil {
		return ctx.Err()
	}

	err := events.SyncCookieValidate(cookie)
	if err != nil {
		return nil
	}

	if subscription.existsLocalStream(cookie.StreamId) {
		// stream is already subscribed. no need to re-subscribe.
		return nil
	}

	streamSub, _, err := s.cache.GetStream(ctx, cookie.StreamId)
	if err != nil {
		return err
	}

	err = subscription.addLocalStream(ctx, cookie, &streamSub)
	if err != nil {
		return err
	}

	return nil
}

func (s *SyncHandlerV2) AddStreamToSync(
	ctx context.Context,
	req *connect_go.Request[protocol.AddStreamToSyncRequest],
) (*connect_go.Response[protocol.AddStreamToSyncResponse], error) {
	ctx, log := ctxAndLogForRequest(ctx, req)
	log.Debug("SyncStreams:SyncHandlerV2.AddStreamToSync ENTER", "syncId", req.Msg.SyncId, "syncPos", req.Msg.SyncPos)

	var subscription *syncSubscriptionImpl
	if subscription = s.syncIdToSubscription[req.Msg.SyncId]; subscription == nil {
		log.Debug("SyncStreams:SyncHandlerV2.AddStreamToSync: SyncId not found", "syncId", req.Msg.SyncId)
		return nil, base.RiverError(protocol.Err_NOT_FOUND, "SyncId not found").Func("AddStreamToSync")
	}

	cookie := req.Msg.SyncPos
	// Two cases to handle. Either local cookie or remote cookie.
	if cookie.NodeAddress == s.wallet.AddressStr {
		// Case 1: local cookie
		if err := s.addLocalStreamToSync(ctx, cookie, subscription); err != nil {
			log.Debug("SyncStreams:SyncHandlerV2.AddStreamToSync: failed to add local streams", "syncId", req.Msg.SyncId, "err", err)
			return nil, err
		}
		// done.
		return connect_go.NewResponse(&protocol.AddStreamToSyncResponse{}), nil
	}

	// Case 2: remote cookie
	remoteNode := subscription.remoteNodes[cookie.NodeAddress]
	isNewRemoteNode := remoteNode == nil
	if isNewRemoteNode {
		// the remote node does not exist in the subscription. add it.
		stub, err := s.nodeRegistry.GetStreamServiceClientForAddress(cookie.NodeAddress)
		if err != nil {
			// TODO: Handle the case when node is no longer available.
			return nil, err
		}
		if stub == nil {
			panic("stub always should set for the remote node")
		}

		remoteNode = &syncNode{
			address:         cookie.NodeAddress,
			forwarderSyncId: subscription.SyncId,
			stub:            stub,
		}
		subscription.addRemoteNode(cookie.NodeAddress, remoteNode)
	}
	subscription.addRemoteStream(cookie)

	if isNewRemoteNode {
		// tell the new remote node to sync
		syncPos := make([]*protocol.SyncCookie, 0, 1)
		syncPos = append(syncPos, cookie)
		go remoteNode.syncRemoteNode(ctx, subscription.SyncId, syncPos, subscription)
	} else {
		// tell the existing remote nodes to add the streams to sync
		go remoteNode.addStreamToSync(ctx, cookie, subscription)
	}

	log.Debug("SyncStreams:SyncHandlerV2.AddStreamToSync LEAVE", "syncId", req.Msg.SyncId)
	return connect_go.NewResponse(&protocol.AddStreamToSyncResponse{}), nil
}

func (s *SyncHandlerV2) RemoveStreamFromSync(
	ctx context.Context,
	req *connect_go.Request[protocol.RemoveStreamFromSyncRequest],
) (*connect_go.Response[protocol.RemoveStreamFromSyncResponse], error) {
	ctx, log := ctxAndLogForRequest(ctx, req)
	log.Debug("SyncStreams:SyncHandlerV2.RemoveStreamFromSync ENTER", "syncId", req.Msg.SyncId, "streamId", req.Msg.StreamId)

	var subscription *syncSubscriptionImpl
	if subscription = s.syncIdToSubscription[req.Msg.SyncId]; subscription == nil {
		log.Debug("SyncStreams:SyncHandlerV2.RemoveStreamFromSync: SyncId not found", "syncId", req.Msg.SyncId)
		return nil, base.RiverError(protocol.Err_NOT_FOUND, "SyncId not found").Func("RemoveStreamFromSync")
	}

	// figure out which stream to remove, and which remote node to remove from.
	streamId := req.Msg.StreamId
	if subscription.existsLocalStream(streamId) {
		subscription.removeLocalStream(streamId)
	}
	// use the streamId to find the remote node to remove from
	if remoteNode := subscription.remoteStreams[streamId]; remoteNode != nil {
		go remoteNode.removeStreamFromSync(ctx, streamId, subscription)
		subscription.removeRemoteStream(streamId)
	}

	// remove any remote nodes that no longer have any streams to sync
	subscription.purgeUnusedRemoteNodes()

	log.Debug("SyncStreams:SyncHandlerV2.RemoveStreamFromSync LEAVE", "syncId", req.Msg.SyncId)
	return connect_go.NewResponse(&protocol.RemoveStreamFromSyncResponse{}), nil
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
	log.Info("SyncStreams:AddSubscription: syncId subscription added", "syncId", syncId)
	return subscription, nil
}

func (s *SyncHandlerV2) RemoveSubscription(
	ctx context.Context,
	syncId string,
) {
	log := dlog.CtxLog(ctx)
	s.syncLock.Lock()
	defer s.syncLock.Unlock()
	if subscription := s.syncIdToSubscription[syncId]; subscription != nil {
		subscription.close()
		delete(s.syncIdToSubscription, syncId)
		log.Info("SyncStreams:RemoveSubscription: syncId subscription removed", "syncId", syncId)
	} else {
		log.Info("SyncStreams:RemoveSubscription: syncId not found", "syncId", syncId)
	}
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

func (s *SyncHandlerV1) AddStreamToSync(
	ctx context.Context,
	req *connect_go.Request[protocol.AddStreamToSyncRequest],
) (*connect_go.Response[protocol.AddStreamToSyncResponse], error) {
	return nil, base.RiverError(protocol.Err_UNIMPLEMENTED, "Not Implemented").Func("AddStreamToSync")
}

func (s *SyncHandlerV1) RemoveStreamFromSync(
	ctx context.Context,
	req *connect_go.Request[protocol.RemoveStreamFromSyncRequest],
) (*connect_go.Response[protocol.RemoveStreamFromSyncResponse], error) {
	return nil, base.RiverError(protocol.Err_UNIMPLEMENTED, "Not Implemented").Func("RemoveStreamFromSync")
}

func (s *SyncHandlerV1) RemoveSync(
	ctx context.Context,
	req *connect_go.Request[protocol.RemoveSyncRequest],
) (*connect_go.Response[protocol.RemoveSyncResponse], error) {
	return nil, base.RiverError(protocol.Err_UNIMPLEMENTED, "Not Implemented").Func("RemoveSync")
}

func (s *SyncHandlerV1) syncStreamsImpl(
	ctx context.Context,
	req *connect_go.Request[protocol.SyncStreamsRequest],
	res *connect_go.ServerStream[protocol.SyncStreamsResponse],
) error {
	log := dlog.CtxLog(ctx)

	localNodeAddress := s.wallet.AddressStr
	localCookies, remoteCookies := getLocalAndRemoteCookies(localNodeAddress, req.Msg.SyncPos)

	remotes := make(map[string]*syncNode)
	defer func() {
		for _, remote := range remotes {
			remote.close()
		}
	}()

	for nodeAddr := range remoteCookies {
		_, ok := remotes[nodeAddr]
		if !ok {
			stub, err := s.nodeRegistry.GetStreamServiceClientForAddress(nodeAddr)
			if err != nil {
				// TODO: Handle the case when node is no longer available.
				return err
			}
			if stub == nil {
				panic("stub always should set for the remote node")
			}

			remote := &syncNode{
				address: nodeAddr,
				stub:    stub,
			}
			remotes[nodeAddr] = remote
		}
	}

	syncCtx, cancelSync := context.WithCancel(ctx)

	receiver := &syncReceiver{
		ctx:     syncCtx,
		cancel:  cancelSync,
		channel: make(chan *protocol.SyncStreamsResponse, 128),
	}

	if len(localCookies) > 0 {
		go s.syncLocalNode(syncCtx, localCookies, receiver)
	}

	for _, remote := range remotes {
		c := remoteCookies[remote.address]
		go remote.syncRemoteNode(syncCtx, "", c, receiver)
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
func (n *syncNode) syncRemoteNode(ctx context.Context, forwarderSyncId string, syncPos []*protocol.SyncCookie, receiver events.SyncResultReceiver) {
	log := dlog.CtxLog(ctx)
	if ctx.Err() != nil || n.isClosed() {
		log.Debug("SyncStreams: syncRemoteNode not started", "context_error", ctx.Err())
		return
	}
	if n.remoteSyncId != "" {
		log.Debug("SyncStreams: syncRemoteNode not started because there is an existing sync", "remoteSyncId", n.remoteSyncId, "forwarderSyncId", forwarderSyncId)
		return
	}

	stream, err := n.stub.SyncStreams(
		ctx,
		&connect_go.Request[protocol.SyncStreamsRequest]{
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

	n.remoteSyncId = stream.Msg().SyncId
	n.forwarderSyncId = forwarderSyncId

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

func (n *syncNode) addStreamToSync(
	ctx context.Context,
	cookie *protocol.SyncCookie,
	receiver events.SyncResultReceiver,
) {
	log := dlog.CtxLog(ctx)
	if ctx.Err() != nil || n.isClosed() {
		log.Debug("SyncStreams:syncNode addStreamToSync not started", "context_error", ctx.Err())
	}
	if n.remoteSyncId == "" {
		log.Debug("SyncStreams:syncNode addStreamToSync not started because there is no existing sync", "remoteSyncId", n.remoteSyncId)
	}

	_, err := n.stub.AddStreamToSync(
		ctx,
		&connect_go.Request[protocol.AddStreamToSyncRequest]{
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
) {
	log := dlog.CtxLog(ctx)
	if ctx.Err() != nil || n.isClosed() {
		log.Debug("SyncStreams:syncNode removeStreamsFromSync not started", "context_error", ctx.Err())
	}
	if n.remoteSyncId == "" {
		log.Debug("SyncStreams:syncNode removeStreamsFromSync not started because there is no existing sync", "syncId", n.remoteSyncId)
	}

	_, err := n.stub.RemoveStreamFromSync(
		ctx,
		&connect_go.Request[protocol.RemoveStreamFromSyncRequest]{
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
