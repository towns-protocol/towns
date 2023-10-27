package rpc

import (
	. "casablanca/node/base"
	"casablanca/node/dlog"
	. "casablanca/node/events"
	. "casablanca/node/protocol"
	. "casablanca/node/protocol/protocolconnect"
	"context"
	"errors"
	"sync"

	connect_go "github.com/bufbuild/connect-go"
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

type syncNode struct {
	syncPos []*SyncCookie
	stub    StreamServiceClient

	mu     sync.Mutex
	stream *connect_go.ServerStreamForClient[SyncStreamsResponse]
	closed bool
}

func (s *Service) SyncStreams(
	ctx context.Context,
	req *connect_go.Request[SyncStreamsRequest],
	res *connect_go.ServerStream[SyncStreamsResponse],
) error {
	ctx, log := ctxAndLogForRequest(ctx, req)
	log.Debug("SyncStreams ENTER", "syncPos", req.Msg.SyncPos)
	e := s.syncStreamsImpl(ctx, req, res)
	if e != nil {
		err := AsRiverError(e).Func("SyncStreams")
		if err.Code == Err_CANCELED {
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

func (s *Service) AddStreamToSync(ctx context.Context, req *connect_go.Request[AddStreamToSyncRequest]) (*connect_go.Response[AddStreamToSyncResponse], error) {
	err := AsRiverError(errors.New("not yet implemented")).Func("AddStreamToSync")
	return connect_go.NewResponse(&AddStreamToSyncResponse{}), err
}

func (s *Service) RemoveStreamFromSync(ctx context.Context, req *connect_go.Request[RemoveStreamFromSyncRequest]) (*connect_go.Response[RemoveStreamFromSyncResponse], error) {
	err := AsRiverError(errors.New("not yet implemented")).Func("RemoveStreamFromSync")
	return connect_go.NewResponse(&RemoveStreamFromSyncResponse{}), err
}

func (s *Service) syncStreamsImpl(
	ctx context.Context,
	req *connect_go.Request[SyncStreamsRequest],
	res *connect_go.ServerStream[SyncStreamsResponse],
) error {
	log := dlog.CtxLog(ctx)

	local := make([]*SyncCookie, 0, 8)
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
					syncPos: []*SyncCookie{cookie},
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
		channel: make(chan *SyncStreamsResponse, 128),
	}

	if len(local) > 0 {
		go s.syncLocalNode(syncCtx, local, receiver)
	}

	for _, remote := range remotes {
		go remote.syncRemoteNode(syncCtx, receiver)
	}

	receiver.dispatch(res)

	err := receiver.getError()
	if err != nil {
		return err
	}

	log.Error("SyncStreams: sync always should be terminated by context cancel.")
	return nil
}

func (s *Service) syncLocalStreamsImpl(ctx context.Context, syncPos []*SyncCookie, receiver SyncResultReceiver) error {
	if len(syncPos) <= 0 {
		return nil
	}

	subs := make([]SyncStream, 0, len(syncPos))
	defer func() {
		for _, sub := range subs {
			sub.Unsub(receiver)
		}
	}()

	for _, pos := range syncPos {
		if ctx.Err() != nil {
			return ctx.Err()
		}

		err := SyncCookieValidate(pos)
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

func (s *Service) syncLocalNode(ctx context.Context, syncPos []*SyncCookie, receiver SyncResultReceiver) {
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
func (n *syncNode) syncRemoteNode(ctx context.Context, receiver SyncResultReceiver) {
	log := dlog.CtxLog(ctx)
	if ctx.Err() != nil || n.isClosed() {
		log.Debug("SyncStreams: syncRemoteNode not starting", "context_error", ctx.Err())
		return
	}

	stream, err := n.stub.SyncStreams(
		ctx,
		&connect_go.Request[SyncStreamsRequest]{
			Msg: &SyncStreamsRequest{
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

func (n *syncNode) setStream(stream *connect_go.ServerStreamForClient[SyncStreamsResponse]) bool {
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
