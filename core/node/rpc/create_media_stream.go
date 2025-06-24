package rpc

import (
	"context"
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
	"github.com/towns-protocol/towns/core/node/storage"
)

func (s *Service) createMediaStreamImpl(
	ctx context.Context,
	req *connect.Request[CreateMediaStreamRequest],
) (*connect.Response[CreateMediaStreamResponse], error) {
	cc, err := s.createMediaStream(ctx, req.Msg)
	if err != nil {
		return nil, AsRiverError(err).Func("createMediaStreamImpl")
	}

	return connect.NewResponse(&CreateMediaStreamResponse{
		NextCreationCookie: cc,
	}), nil
}

func (s *Service) createMediaStream(ctx context.Context, req *CreateMediaStreamRequest) (*CreationCookie, error) {
	log := logging.FromCtx(ctx)

	streamId, err := StreamIdFromBytes(req.StreamId)
	if err != nil {
		return nil, AsRiverError(err, Err_BAD_STREAM_CREATION_PARAMS)
	}

	if len(req.Events) == 0 {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "no events")
	}

	parsedEvents, err := ParseEvents(req.Events)
	if err != nil {
		return nil, err
	}

	log.Debugw("createStream", "parsedEvents", parsedEvents)

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
		return nil, err
	}

	// check that streams exist for derived events that will be added later
	for _, event := range csRules.DerivedEvents {
		streamIdBytes := event.StreamId
		stream, err := s.cache.GetStreamNoWait(ctx, streamIdBytes)
		if err != nil || stream == nil {
			return nil, RiverError(Err_PERMISSION_DENIED, "stream does not exist", "streamId", streamIdBytes)
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
			return nil, RiverError(Err_PERMISSION_DENIED, "failed to load creator stream", "error", err)
		}
		for _, streamIdBytes := range csRules.RequiredMemberships {
			streamId, err := StreamIdFromBytes(streamIdBytes)
			if err != nil {
				return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "invalid stream id", "error", err)
			}
			if !creatorStreamView.IsMemberOf(streamId) {
				return nil, RiverError(Err_PERMISSION_DENIED, "not a member of", "requiredStreamId", streamId)
			}
		}
	}

	// check that all required users exist in the system
	for _, userAddress := range csRules.RequiredUserAddrs {
		addr, err := BytesToAddress(userAddress)
		if err != nil {
			return nil, RiverError(Err_PERMISSION_DENIED, "invalid user id", "requiredUser", userAddress)
		}
		userStreamId := UserStreamIdFromAddr(addr)
		_, err = s.cache.GetStreamNoWait(ctx, userStreamId)
		if err != nil {
			return nil, RiverError(Err_PERMISSION_DENIED, "user does not exist", "requiredUser", userAddress)
		}
	}

	// check entitlements
	if csRules.ChainAuth != nil {
		isEntitledResult, err := s.chainAuth.IsEntitled(ctx, s.config, csRules.ChainAuth)
		if err != nil {
			return nil, err
		}
		if !isEntitledResult.IsEntitled() {
			return nil, RiverError(
				Err_PERMISSION_DENIED,
				"IsEntitled failed",
				"reason", isEntitledResult.Reason().String(),
				"chainAuthArgs",
				csRules.ChainAuth.String(),
			).Func("createStream")
		}
	}

	// create the stream
	resp, err := s.createReplicatedMediaStream(ctx, streamId, []*ParsedEvent{parsedEvents[0]})
	if err != nil && !IsRiverErrorCode(err, Err_ALREADY_EXISTS) {
		return nil, err
	}

	// add derived events
	for _, de := range csRules.DerivedEvents {
		_, err = s.AddEventPayload(ctx, de.StreamId, de.Payload, de.Tags)
		if err != nil {
			return nil, RiverError(Err_INTERNAL, "failed to add derived event", "error", err)
		}
	}

	// add first media chunk if provided
	if len(parsedEvents) > 1 {
		chunk := parsedEvents[1].Event.GetMediaPayload().GetChunk()

		// Make sure the given chunk index is 0 as it is the first chunk
		if chunk.GetChunkIndex() != 0 {
			return nil, RiverError(Err_INVALID_ARGUMENT, "initial chunk index must be zero").
				Func("createMediaStream")
		}

		// Make sure the given chunk size does not exceed the maximum chunk size
		if uint64(len(chunk.GetData())) > s.chainConfig.Get().MediaMaxChunkSize {
			return nil, RiverError(
				Err_INVALID_ARGUMENT,
				"chunk size must be less than or equal to",
				"s.chainConfig.Get().MediaMaxChunkSize",
				s.chainConfig.Get().MediaMaxChunkSize).
				Func("createMediaStream")
		}

		mbHash, err := s.replicatedAddMediaEvent(
			ctx,
			parsedEvents[1],
			resp,
			parsedEvents[0].Event.GetMediaPayload().GetInception().GetChunkCount() == 1,
		)
		if err != nil && !IsRiverErrorCode(err, Err_ALREADY_EXISTS) {
			return nil, AsRiverError(err).Func("createMediaStream")
		}

		resp.MiniblockNum++
		resp.PrevMiniblockHash = mbHash
	}

	return resp, nil
}

func (s *Service) createReplicatedMediaStream(
	ctx context.Context,
	streamId StreamId,
	parsedEvents []*ParsedEvent,
) (*CreationCookie, error) {
	mb, err := MakeGenesisMiniblock(s.wallet, parsedEvents)
	if err != nil {
		return nil, err
	}

	mbBytes, err := proto.Marshal(mb)
	if err != nil {
		return nil, err
	}

	nodesList, err := s.nodeRegistry.ChooseStreamNodes(ctx, streamId, int(s.chainConfig.Get().ReplicationFactor))
	if err != nil {
		return nil, err
	}

	nodes := NewStreamNodesWithLock(len(nodesList), nodesList, s.wallet.Address)
	remotes, isLocal := nodes.GetRemotesAndIsLocal()
	sender := NewQuorumPool(
		ctx,
		NewQuorumPoolOpts().WriteMode().WithTags("method", "createReplicatedMediaStream", "streamId", streamId),
	)

	// Create ephemeral stream within the local node
	if isLocal {
		sender.AddTask(func(ctx context.Context) error {
			return s.storage.CreateEphemeralStreamStorage(ctx, streamId, &storage.WriteMiniblockData{Data: mbBytes})
		})
	}

	// Create ephemeral stream in replicas
	sender.AddNodeTasks(remotes, func(ctx context.Context, node common.Address) error {
		stub, err := s.nodeRegistry.GetNodeToNodeClientForAddress(node)
		if err != nil {
			return err
		}

		_, err = stub.AllocateEphemeralStream(
			ctx,
			connect.NewRequest(
				&AllocateEphemeralStreamRequest{
					StreamId:  streamId[:],
					Miniblock: mb,
				},
			),
		)

		return err
	})

	if err = sender.Wait(); err != nil {
		return nil, err
	}

	nodesListRaw := make([][]byte, len(nodesList))
	for i, addr := range nodesList {
		nodesListRaw[i] = addr.Bytes()
	}

	return &CreationCookie{
		StreamId:          streamId[:],
		Nodes:             nodesListRaw,
		MiniblockNum:      1, // the block number after the genesis one is 1
		PrevMiniblockHash: mb.Header.Hash,
	}, nil
}
