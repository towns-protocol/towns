package rpc

import (
	"context"
	"sync"
	"sync/atomic"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"google.golang.org/protobuf/proto"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rules"
	. "github.com/towns-protocol/towns/core/node/shared"
)

func (s *Service) createStreamImpl(
	ctx context.Context,
	req *connect.Request[CreateStreamRequest],
) (*connect.Response[CreateStreamResponse], error) {
	stream, derivedEvents, err := s.createStream(ctx, req.Msg)
	if err != nil {
		return nil, AsRiverError(err).Func("createStreamImpl")
	}
	resMsg := &CreateStreamResponse{
		Stream:        stream,
		DerivedEvents: derivedEvents,
	}
	return connect.NewResponse(resMsg), nil
}

func (s *Service) createStream(ctx context.Context, req *CreateStreamRequest) (*StreamAndCookie, []*EventRef, error) {
	log := logging.FromCtx(ctx)

	streamId, err := StreamIdFromBytes(req.StreamId)
	if err != nil {
		return nil, nil, RiverErrorWithBase(
			Err_BAD_STREAM_CREATION_PARAMS,
			"invalid stream id",
			err,
			"streamId",
			streamId,
		).Func("createStream")
	}

	if len(req.Events) == 0 {
		return nil, nil, RiverError(
			Err_BAD_STREAM_CREATION_PARAMS,
			"no events",
			"streamId",
			streamId,
		).Func("createStream")
	}

	parsedEvents, err := ParseEvents(req.Events)
	if err != nil {
		return nil, nil, RiverErrorWithBase(
			Err_BAD_STREAM_CREATION_PARAMS,
			"error parsing events",
			err,
			"streamId",
			streamId,
		).Func("createStream")
	}

	log.Debugw("createStream", "streamId", streamId, "parsedEvents", parsedEvents)

	csRules, err := rules.CanCreateStream(
		ctx,
		s.config,
		s.chainConfig,
		time.Now(),
		streamId,
		parsedEvents,
		req.Metadata,
		s.nodeRegistry,
	)
	if err != nil {
		return nil, nil, RiverErrorWithBase(
			Err_PERMISSION_DENIED,
			"error checking stream creation rules",
			err,
			"streamId",
			streamId,
		).Func("createStream")
	}

	// check that streams exist for derived events that will be added later
	if csRules.DerivedEvents != nil {
		for _, event := range csRules.DerivedEvents {
			derivedStreamIdBytes := event.StreamId
			stream, err := s.cache.GetStreamNoWait(ctx, derivedStreamIdBytes)
			if err != nil {
				return nil, nil, RiverErrorWithBase(
					Err_INTERNAL,
					"error fetching parent stream",
					err,
					"derivedStreamId",
					derivedStreamIdBytes,
					"streamId",
					streamId,
				)
			}
			if stream == nil {
				return nil, nil, RiverError(
					Err_PERMISSION_DENIED,
					"parent stream does not exist",
					"derivedStreamId",
					derivedStreamIdBytes,
					"streamId",
					streamId,
				).Func("createStream")
			}
		}
	}

	// check that the creator satisfies the required memberships reqirements
	if csRules.RequiredMemberships != nil {
		// load the creator's user stream
		stream, err := s.loadStream(ctx, csRules.CreatorStreamId)
		var creatorStreamView *StreamView
		if err == nil {
			creatorStreamView, err = stream.GetView(ctx)
		}
		if err != nil {
			return nil, nil, RiverErrorWithBase(
				Err_PERMISSION_DENIED,
				"failed to load creator stream",
				err,
				"streamId",
				streamId,
				"creatorStreamId",
				csRules.CreatorStreamId,
			).Func("createStream")
		}
		for _, requiredStreamIdBytes := range csRules.RequiredMemberships {
			requiredStreamId, err := StreamIdFromBytes(requiredStreamIdBytes)
			if err != nil {
				return nil, nil, RiverErrorWithBase(
					Err_BAD_STREAM_CREATION_PARAMS,
					"invalid stream id",
					err,
					"requiredStreamIdBytes",
					requiredStreamIdBytes,
					"streamId",
					streamId,
				).Func("createStream")
			}
			if !creatorStreamView.IsMemberOf(requiredStreamId) {
				return nil, nil, RiverError(
					Err_PERMISSION_DENIED,
					"not a member of",
					"requiredStreamId",
					requiredStreamId,
					"streamId",
					streamId,
				).Func("createStream")
			}
		}
	}

	// check that all required users exist in the system
	for _, userAddress := range csRules.RequiredUserAddrs {
		addr, err := BytesToAddress(userAddress)
		if err != nil {
			return nil, nil, RiverErrorWithBase(
				Err_PERMISSION_DENIED,
				"invalid user id",
				err,
				"requiredUser",
				userAddress,
				"streamId",
				streamId,
			).Func("createStream")
		}
		userStreamId := UserStreamIdFromAddr(addr)
		_, err = s.cache.GetStreamNoWait(ctx, userStreamId)
		if err != nil {
			return nil, nil, RiverErrorWithBase(
				Err_PERMISSION_DENIED,
				"user does not exist",
				err,
				"requiredUser",
				userAddress,
				"streamId",
				streamId,
			).Func("createStream")
		}
	}

	// check entitlements
	if csRules.ChainAuth != nil {
		isEntitledResult, err := s.chainAuth.IsEntitled(ctx, s.config, csRules.ChainAuth)
		if err != nil {
			return nil, nil, RiverErrorWithBase(
				Err_INTERNAL,
				"IsEntitled errored",
				err,
				"streamId",
				streamId,
			).Func("createStream")
		}
		if !isEntitledResult.IsEntitled() {
			return nil, nil, RiverError(
				Err_PERMISSION_DENIED,
				"IsEntitled failed",
				"reason",
				isEntitledResult.Reason().String(),
				"chainAuthArgs",
				csRules.ChainAuth.String(),
				"streamId",
				streamId,
			).Func("createStream")
		}
	}

	// create the stream
	log.Debugw("createStream", "streamId", streamId)
	resp, err := s.createReplicatedStream(ctx, streamId, parsedEvents)
	if err != nil && !AsRiverError(err).IsCodeWithBases(Err_ALREADY_EXISTS) {
		return nil, nil, RiverErrorWithBase(
			Err_INTERNAL,
			"failed to create replicated stream",
			err,
			"streamId",
			streamId,
		).Func("createStream")
	}

	var derivedEvents []*EventRef = nil

	// add derived events
	if csRules.DerivedEvents != nil {
		derivedEvents = make([]*EventRef, 0)
		for _, de := range csRules.DerivedEvents {
			newEvents, err := s.AddEventPayload(ctx, de.StreamId, de.Payload, de.Tags)
			derivedEvents = append(derivedEvents, newEvents...)
			if err != nil {
				return resp, derivedEvents, RiverErrorWithBase(
					Err_INTERNAL,
					"failed to add derived event",
					err,
					"derivedStreamId",
					de.StreamId,
					"streamId",
					streamId,
				).Func("createStream")
			}
		}
	}

	return resp, derivedEvents, nil
}

func (s *Service) createReplicatedStream(
	ctx context.Context,
	streamId StreamId,
	parsedEvents []*ParsedEvent,
) (*StreamAndCookie, error) {
	mb, err := MakeGenesisMiniblock(s.wallet, parsedEvents)
	if err != nil {
		return nil, err
	}

	mbBytes, err := proto.Marshal(mb)
	if err != nil {
		return nil, err
	}

	nodesList, err := s.streamRegistry.AllocateStream(ctx, streamId, common.BytesToHash(mb.Header.Hash), mbBytes)
	if err != nil {
		return nil, err
	}

	nodes := NewStreamNodesWithLock(len(nodesList), nodesList, s.wallet.Address)
	remotes, isLocal := nodes.GetRemotesAndIsLocal()
	sender := NewQuorumPool(
		ctx,
		NewQuorumPoolOpts().WriteMode().WithTags("method", "createReplicatedStream", "streamId", streamId),
	)

	var localSyncCookie atomic.Pointer[SyncCookie]
	if isLocal {
		sender.AddTask(func(ctx context.Context) error {
			st, err := s.cache.GetStreamNoWait(ctx, streamId)
			if err != nil {
				return err
			}
			sv, err := st.GetView(ctx)
			if err != nil {
				return err
			}
			localSyncCookie.Store(sv.SyncCookie(s.wallet.Address))
			return nil
		})
	}

	var remoteSyncCookie *SyncCookie
	var remoteSyncCookieOnce sync.Once
	if len(remotes) > 0 {
		sender.AddNodeTasks(remotes, func(ctx context.Context, node common.Address) error {
			stub, err := s.nodeRegistry.GetNodeToNodeClientForAddress(node)
			if err != nil {
				return err
			}
			r, err := stub.AllocateStream(
				ctx,
				connect.NewRequest(
					&AllocateStreamRequest{
						StreamId:  streamId[:],
						Miniblock: mb,
					},
				),
			)
			if err != nil {
				return err
			}
			remoteSyncCookieOnce.Do(func() {
				remoteSyncCookie = r.Msg.SyncCookie
			})
			return nil
		})
	}

	err = sender.Wait()
	if err != nil {
		return nil, err
	}

	cookie := localSyncCookie.Load()
	if cookie == nil {
		cookie = remoteSyncCookie
	}

	return &StreamAndCookie{
		NextSyncCookie: cookie,
		Miniblocks:     []*Miniblock{mb},
	}, nil
}
