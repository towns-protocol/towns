package rpc

import (
	. "casablanca/node/base"
	"casablanca/node/dlog"
	. "casablanca/node/nodes"
	. "casablanca/node/protocol"
	"context"
	"sync"

	connect_go "github.com/bufbuild/connect-go"
)

type syncNode struct {
	syncPos []*SyncCookie
	stub    StreamServiceClientOnly

	mu     sync.Mutex
	stream *connect_go.ServerStreamForClient[SyncStreamsResponse]
	closed bool
}

func (f *forwarderImpl) SyncStreams(
	ctx context.Context,
	req *connect_go.Request[SyncStreamsRequest],
	res *connect_go.ServerStream[SyncStreamsResponse],
) error {
	log := dlog.CtxLog(ctx) // TODO: use ctxAndLogForRequest
	log.Debug("fwd.SyncStreams ENTER", "syncPos", req.Msg.SyncPos)
	e := f.syncStreamsImpl(ctx, req, res)
	if e != nil {
		err := AsRiverError(e).Func("fwd.SyncStreams")
		if err.Code == Err_CANCELED {
			// Context is canceled when client disconnects, so this is normal case.
			_ = err.LogDebug(log)
		} else {
			_ = err.LogWarn(log)
		}
		return err.AsConnectError()
	}
	log.Debug("fwd.SyncStreams LEAVE")
	return nil
}

func (f *forwarderImpl) syncStreamsImpl(
	ctx context.Context,
	req *connect_go.Request[SyncStreamsRequest],
	res *connect_go.ServerStream[SyncStreamsResponse],
) error {
	log := dlog.CtxLog(ctx)

	local := make([]*SyncCookie, 0, 8)
	localNodeAddress := f.nodeRegistry.GetLocalNode().NodeAddress

	remotes := make(map[string]*syncNode)
	defer func() {
		for _, remote := range remotes {
			remote.close()
		}
	}()

	// TODO: extend syncCookie to include NodeAddress.
	// TODO: (once above is implemented) handle the case when node is no longer available.
	for _, cookie := range req.Msg.SyncPos {
		nodeAddresses, err := f.streamRegistry.GetNodeAddressesForStream(ctx, cookie.StreamId)
		if err != nil {
			return err
		}

		nodeAddr := nodeAddresses[0]
		if nodeAddr == localNodeAddress {
			local = append(local, cookie)
		} else {
			remote, ok := remotes[nodeAddr]
			if !ok {
				stub, err := f.nodeRegistry.GetRemoteSyncStubForAddress(nodeAddr)
				if err != nil {
					return err
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

	respChan := make(chan syncResult, 64)

	if len(local) > 0 {
		go syncLocalNode(syncCtx, f.nodeRegistry.GetLocalNode().Syncer, local, respChan)
	}

	for _, remote := range remotes {
		go remote.syncRemoteNode(syncCtx, respChan)
	}

	var lastError error
ForwardLoop:
	for {
		select {
		case <-ctx.Done():
			lastError = ctx.Err()
			log.Debug("fwd.SyncStreams: context done", "err", lastError)
			break ForwardLoop
		case resp := <-respChan:
			if resp.err != nil {
				lastError = resp.err
				log.Debug("fwd.SyncStreams: received error in forward loop", "err", lastError)
				break ForwardLoop
			}

			log.Debug("fwd.SyncStreams: received update in forward loop", "resp", resp.resp)
			if err := res.Send(resp.resp); err != nil {
				lastError = err
				log.Debug("fwd.SyncStreams: failed to send update", "resp", "err", lastError)
				break ForwardLoop
			}
		}
	}

	cancelSync()

	if lastError != nil {
		return lastError
	}

	log.Error("fwd.SyncStreams: sync always should be terminated by context cancel.")
	return nil
}

type syncResult struct {
	resp *SyncStreamsResponse
	err  error
}

func syncLocalNode(ctx context.Context, syncer LocalStreamSyncer, syncPos []*SyncCookie, respChannel chan<- syncResult) {
	log := dlog.CtxLog(ctx)

	if ctx.Err() != nil {
		log.Debug("fwd.SyncStreams: syncLocalNode not starting", "context_error", ctx.Err())
		return
	}

	err := syncer.SyncLocalStreams(
		ctx,
		syncPos,
		func(update *StreamAndCookie) error {
			if ctx.Err() != nil {
				log.Debug("fwd.SyncStreams: syncLocalNode not sending", "context_error", ctx.Err())
				return ctx.Err()
			}

			log.Debug("fwd.SyncStreams: syncLocalNode sending", "update", update)
			updates := []*StreamAndCookie{update}
			respChannel <- syncResult{resp: &SyncStreamsResponse{
				Streams: updates,
			}}
			return nil
		},
	)

	if err != nil {
		log.Debug("fwd.SyncStreams: syncLocalNode failed", "err", err)
		respChannel <- syncResult{err: err}
	}
}

// TODO: connect-go is not using channels for streaming (>_<), so it's a bit tricky to close all these
// streams properly. For now basic protocol is to close entire sync if there is any error.
// Which in turn means that we need to close all outstanding streams to remote nodes.
// Without control signals there is no clean way to do so, so for now both ctx is canceled and Close is called
// async hoping this will trigger Receive to abort.
func (n *syncNode) syncRemoteNode(ctx context.Context, respChannel chan<- syncResult) {
	log := dlog.CtxLog(ctx)
	if ctx.Err() != nil || n.isClosed() {
		log.Debug("fwd.SyncStreams: syncRemoteNode not starting", "context_error", ctx.Err())
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
		log.Debug("fwd.SyncStreams: syncRemoteNode remote SyncStreams failed", "err", err)
		respChannel <- syncResult{err: err}
		return
	}

	if !n.setStream(stream) {
		log.Debug("fwd.SyncStreams: syncRemoteNode already closed")
		// means that n.close() was already called.
		stream.Close()
		return
	}

	if ctx.Err() != nil {
		log.Debug("fwd.SyncStreams: syncRemoteNode not receiving", "context_error", ctx.Err())
		return
	}

	for stream.Receive() {
		if ctx.Err() != nil || n.isClosed() {
			log.Debug("fwd.SyncStreams: syncRemoteNode receive canceled", "context_error", ctx.Err())
			return
		}

		log.Debug("fwd.SyncStreams: syncRemoteNode received update", "resp", stream.Msg())
		respChannel <- syncResult{resp: stream.Msg()}
	}

	if ctx.Err() != nil || n.isClosed() {
		return
	}

	if err := stream.Err(); err != nil {
		log.Debug("fwd.SyncStreams: syncRemoteNode receive failed", "err", err)
		respChannel <- syncResult{err: err}
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
