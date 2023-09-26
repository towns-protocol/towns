package nodes

import (
	. "casablanca/node/base"
	"casablanca/node/dlog"
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

type syncDispatcher struct {
	remotes map[string]*syncNode
	local   []*SyncCookie
}

func (f *forwarderImpl) SyncStreams(
	ctx context.Context,
	req *connect_go.Request[SyncStreamsRequest],
	res *connect_go.ServerStream[SyncStreamsResponse],
) error {
	log := dlog.CtxLog(ctx) // TODO: use ctxAndLogForRequest
	log.Debug("fwd.SyncStreams ENTER", "syncPos", req.Msg.SyncPos)
	e := f.syncStreamsIml(ctx, req, res)
	if e != nil {
		return AsRiverError(e).Func("fwd.SyncStreams").LogWarn(log).AsConnectError()
	}
	log.Debug("fwd.SyncStreams LEAVE")
	return nil
}

func (f *forwarderImpl) syncStreamsIml(
	ctx context.Context,
	req *connect_go.Request[SyncStreamsRequest],
	res *connect_go.ServerStream[SyncStreamsResponse],
) error {
	disp := &syncDispatcher{
		remotes: make(map[string]*syncNode),
		local:   make([]*SyncCookie, 0, 8),
	}

	localNodeAddress := f.nodeRegistry.GetLocalNode().NodeAddress

	// TODO: extend syncCookie to include NodeAddress.
	// TODO: (once above is implemented) handle the case when node is no longer available.
	for _, cookie := range req.Msg.SyncPos {
		nodeAddresses, err := f.streamRegistry.GetNodeAddressesForStream(cookie.StreamId, false)
		if err != nil {
			return err
		}

		nodeAddr := nodeAddresses[0]
		if nodeAddr == localNodeAddress {
			disp.local = append(disp.local, cookie)
		} else {
			remote, ok := disp.remotes[nodeAddr]
			if !ok {
				stub, err := f.nodeRegistry.GetRemoteSyncStubForAddress(nodeAddr)
				if err != nil {
					return err
				}

				remote = &syncNode{
					syncPos: []*SyncCookie{cookie},
					stub:    stub,
				}
				disp.remotes[nodeAddr] = remote
			} else {
				remote.syncPos = append(remote.syncPos, cookie)
			}
		}
	}

	// Shortcut to local-only if there are no remote streams to sync.
	// TODO: I guess it's not going to work with side-channel sub/unsub.
	if len(disp.remotes) == 0 {
		return f.nodeRegistry.GetLocalNode().Stub.SyncStreams(ctx, req, res)
	}

	syncCtx, cancelSync := context.WithCancel(ctx)

	respChan := make(chan syncResult, 64)

	if len(disp.local) > 0 {
		syncLocalNode(syncCtx, f.nodeRegistry.GetLocalNode().Syncer, disp.local, respChan)
	}

	for _, remote := range disp.remotes {
		go remote.syncRemoteNode(syncCtx, respChan)
	}

	var lastError error
ForwardLoop:
	for {
		select {
		case <-ctx.Done():
			lastError = ctx.Err()
			break ForwardLoop
		case resp := <-respChan:
			if resp.err != nil {
				lastError = resp.err
				break ForwardLoop
			}

			if err := res.Send(resp.resp); err != nil {
				lastError = err
				break ForwardLoop
			}
		}
	}

	cancelSync()
	for _, remote := range disp.remotes {
		remote.close()
	}

	if lastError != nil {
		return lastError
	}

	// TODO: currently there is no way to terminate sync from client, so this should never be reached...
	// TODO: how disconnected clients are detected?
	return nil
}

type syncResult struct {
	resp *SyncStreamsResponse
	err  error
}

func syncLocalNode(ctx context.Context, syncer LocalStreamSyncer, syncPos []*SyncCookie, respChannel chan<- syncResult) {
	if ctx.Err() != nil {
		return
	}

	err := syncer.SyncLocalStreams(
		ctx,
		syncPos,
		func(update *StreamAndCookie) error {
			if ctx.Err() != nil {
				return ctx.Err()
			}

			updates := []*StreamAndCookie{update}
			respChannel <- syncResult{resp: &SyncStreamsResponse{
				Streams: updates,
			}}
			return nil
		},
	)

	if err != nil {
		respChannel <- syncResult{err: err}
	}
}

// TODO: connect-go is not using channels for streaming (>_<), so it's a bit tricky to close all these
// streams properly. For now basic protocol is to close entire sync if there is any error.
// Which in turn means that we need to close all outstanding streams to remote nodes.
// Without control signals there is no clean way to do so, so for now both ctx is canceled and Close is called
// async hoping this will trigger Receive to abort.
func (n *syncNode) syncRemoteNode(ctx context.Context, respChannel chan<- syncResult) {
	if ctx.Err() != nil || n.isClosed() {
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
		respChannel <- syncResult{err: err}
		return
	}

	if !n.setStream(stream) {
		// means that n.close() was already called.
		stream.Close()
		return
	}

	if ctx.Err() != nil {
		return
	}

	for stream.Receive() {
		if ctx.Err() != nil || n.isClosed() {
			return
		}

		respChannel <- syncResult{resp: stream.Msg()}
	}

	if ctx.Err() != nil || n.isClosed() {
		return
	}

	if err := stream.Err(); err != nil {
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
