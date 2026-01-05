package utils

import (
	"context"
	"errors"
	"net"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/rpc/headers"
)

const (
	// RpcStreamIdKey is key under which the streamId is set if the RPC call is made within the context of a stream.
	RpcStreamIdKey = "streamId"
)

type RequestWithStreamId interface {
	GetStreamId() string
}

// CtxAndLogForRequest returns a new context and logger for the given request.
// If the request is made in the context of a stream it will try to add the stream id to the logger.
// Also adds client version header to the log context if present.
func CtxAndLogForRequest[T any](ctx context.Context, req *connect.Request[T]) (context.Context, *logging.Log) {
	log := logging.FromCtx(ctx)

	// Add client version to log context if present in request headers
	if version := req.Header().Get(headers.RiverClientVersionHeader); version != "" {
		log = log.With("clientVersion", version)
	}

	// Add streamId to log context if present in request
	if reqMsg, ok := any(req.Msg).(RequestWithStreamId); ok {
		streamId := reqMsg.GetStreamId()
		if streamId != "" {
			log = log.With(RpcStreamIdKey, streamId).With("application", "streamNode")
			return logging.CtxWithLog(ctx, log), log
		}
	}

	return logging.CtxWithLog(ctx, log), log
}

// UncancelContext returns a new context without original parent cancel.
// Write operations should not be cancelled even if RPC context is cancelled.
// Deadline is re-used from original context. If it's smaller than minTimeout, it's increased.
// If original context has no deadline, it's set to defaultTimeout.
func UncancelContext(
	ctx context.Context,
	minTimeout, defaultTimeout time.Duration,
) (context.Context, context.CancelFunc) {
	deadline, ok := ctx.Deadline()
	now := time.Now()
	if ok {
		if deadline.Before(now.Add(minTimeout)) {
			deadline = now.Add(minTimeout)
		}
	} else {
		deadline = now.Add(defaultTimeout)
	}
	ctx = context.WithoutCancel(ctx)
	return context.WithDeadline(ctx, deadline)
}

// UncancelContextWithTimeout returns a new context without original parent cancel.
// New timeout is set to the given timeout.
func UncancelContextWithTimeout(
	ctx context.Context,
	timeout time.Duration,
) (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.WithoutCancel(ctx), timeout)
}

// PeerNodeRequestWithRetries makes a request to as many as each of the remote nodes for a stream,
// returning the first response that is not a network unavailability error. This utility function
// will advance the sticky peer of the nodes object if any request fails, even if there are no retries.
func PeerNodeRequestWithRetries[T any](
	ctx context.Context,
	nodes StreamNodes,
	makeStubRequest func(ctx context.Context, stub StreamServiceClient, addr common.Address) (*connect.Response[T], error),
	numRetries int,
	nodeRegistry NodeRegistry,
) (*connect.Response[T], error) {
	remotes, _ := nodes.GetRemotesAndIsLocal()
	if len(remotes) <= 0 {
		return nil, RiverError(Err_INTERNAL, "Cannot make peer node requests: no nodes available").
			Func("peerNodeRequestWithRetries")
	}

	var stub StreamServiceClient
	var resp *connect.Response[T]
	var err error

	// Sanity check for malformed configurations
	if numRetries <= 0 {
		numRetries = 1
	}

	// Do not make more than one request to a single node
	numRetries = min(numRetries, len(remotes))

	for retry := 0; retry < numRetries; retry++ {
		peer := nodes.GetStickyPeer()
		stub, err = nodeRegistry.GetStreamServiceClientForAddress(peer)
		if err != nil {
			return nil, AsRiverError(err).
				Func("peerNodeRequestWithRetries").
				Message("Could not get stream service client for address").
				Tag("address", peer)
		}

		resp, err = makeStubRequest(ctx, stub, peer)

		if err == nil {
			return resp, nil
		}

		retry := false
		// TODO: move to a helper function.
		if connectErr := new(connect.Error); errors.As(err, &connectErr) {
			if connect.IsWireError(connectErr) {
				// Error is received from another node. TODO: classify into retryable and non-retryable.
				retry = true
			} else {
				// Error is produced locally.
				// Check if it's a network error and retry in this case.
				if networkError := new(net.OpError); errors.As(connectErr, &networkError) {
					retry = true
				}
			}
		}

		if retry {
			// Mark peer as unavailable.
			nodes.AdvanceStickyPeer(peer)
		} else {
			return nil, AsRiverError(err).
				Func("peerNodeRequestWithRetries").
				Message("makeStubRequest failed").
				Tag("retry", retry).
				Tag("numRetries", numRetries).
				Tag("lastPeer", peer)
		}
	}
	// If all requests fail, return the last error.
	return nil, AsRiverError(err).
		Func("peerNodeRequestWithRetries").
		Message("All retries failed").
		Tag("numRetries", numRetries).
		Tag("lastPeer", nodes.GetStickyPeer())
}

// PeerNodeStreamingResponseWithRetries makes a request with a streaming server response to remote nodes, retrying
// in the event of unavailable nodes.
func PeerNodeStreamingResponseWithRetries(
	ctx context.Context,
	nodes StreamNodes,
	makeStubRequest func(ctx context.Context, stub StreamServiceClient) (hasStreamed bool, err error),
	numRetries int,
	nodeRegistry NodeRegistry,
) error {
	remotes, _ := nodes.GetRemotesAndIsLocal()
	if len(remotes) <= 0 {
		return RiverError(Err_INTERNAL, "Cannot make peer node requests: no nodes available").
			Func("PeerNodeStreamingResponseWithRetries")
	}

	var stub StreamServiceClient
	var err error
	var hasStreamed bool

	if numRetries <= 0 {
		numRetries = 1
	}

	// Do not make more than one request to a single node
	numRetries = min(numRetries, len(remotes))

	for retry := 0; retry < numRetries; retry++ {
		peer := nodes.GetStickyPeer()
		stub, err = nodeRegistry.GetStreamServiceClientForAddress(peer)
		if err != nil {
			return AsRiverError(err).
				Func("PeerNodeStreamingResponseWithRetries").
				Message("Could not get stream service client for address").
				Tag("address", peer)
		}

		// The stub request handles streaming the entire response.
		hasStreamed, err = makeStubRequest(ctx, stub)

		if err == nil {
			return nil
		}

		// TODO: fix to same logic as peerNodeRequestWithRetries.
		if IsConnectNetworkError(err) && !hasStreamed {
			// Mark peer as unavailable.
			nodes.AdvanceStickyPeer(peer)
		} else {
			return AsRiverError(err).
				Message("makeStubRequest failed").
				Func("PeerNodeStreamingResponseWithRetries").
				Tag("hasStreamed", hasStreamed).
				Tag("retry", retry).
				Tag("numRetries", numRetries)
		}
	}
	// If all requests fail, return the last error.
	if err != nil {
		return AsRiverError(err).
			Func("PeerNodeStreamingResponseWithRetries").
			Message("All retries failed").
			Tag("numRetries", numRetries)
	}

	return nil
}
