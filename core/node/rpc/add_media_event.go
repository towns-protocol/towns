package rpc

import (
	"bytes"
	"context"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"google.golang.org/protobuf/proto"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/highusage"
	. "github.com/towns-protocol/towns/core/node/shared"
)

func (s *Service) localAddMediaEvent(
	ctx context.Context,
	req *connect.Request[AddMediaEventRequest],
) (*connect.Response[AddMediaEventResponse], error) {
	log := logging.FromCtx(ctx)
	creationCookie := req.Msg.GetCreationCookie()

	streamId, err := StreamIdFromBytes(creationCookie.StreamId)
	if err != nil {
		return nil, AsRiverError(err).Func("localAddMediaEvent")
	}

	parsedEvent, err := ParseEvent(req.Msg.Event)
	if err != nil {
		return nil, AsRiverError(err).Func("localAddMediaEvent")
	}

	genesisEvent, err := s.getGenesisMediaEvent(ctx, streamId)
	if err != nil {
		return nil, AsRiverError(err).Func("localAddMediaEvent")
	}

	genesisInception := genesisEvent.GetMediaPayload().GetInception()
	chunk := parsedEvent.Event.GetMediaPayload().GetChunk()

	// Make sure only stream creator can add a media chunk
	if !bytes.Equal(parsedEvent.Event.CreatorAddress, genesisEvent.CreatorAddress) {
		return nil, RiverError(
			Err_PERMISSION_DENIED,
			"media event creator is not a creator of the media stream",
			"creatorAddress",
			common.BytesToAddress(genesisEvent.CreatorAddress),
			"streamId",
			streamId,
		)
	}

	// Make sure the given chunk index is within the bounds of the genesis inception
	if chunk.GetChunkIndex() < 0 || chunk.GetChunkIndex() > genesisInception.GetChunkCount() {
		return nil, RiverError(Err_INVALID_ARGUMENT, "chunk index out of bounds")
	}

	// Make sure the given chunk size does not exceed the maximum chunk size
	if uint64(len(chunk.GetData())) > s.chainConfig.Get().MediaMaxChunkSize {
		return nil, RiverError(
			Err_INVALID_ARGUMENT,
			"chunk size must be less than or equal to",
			"s.chainConfig.Get().MediaMaxChunkSize",
			s.chainConfig.Get().MediaMaxChunkSize)
	}

	log.Debugw("localAddMediaEvent", "parsedEvent", parsedEvent, "creationCookie", creationCookie)

	mbHash, err := s.replicatedAddMediaEvent(ctx, parsedEvent, creationCookie, req.Msg.GetLast())
	if err != nil && !AsRiverError(err).IsCodeWithBases(Err_ALREADY_EXISTS) {
		return nil, AsRiverError(err).Func("localAddMediaEvent")
	}

	s.callRateMonitor.RecordCall(parsedEvent.Event.CreatorAddress, time.Now(), highusage.CallTypeMediaEvent)

	return connect.NewResponse(&AddMediaEventResponse{
		CreationCookie: &CreationCookie{
			StreamId:          streamId[:],
			Nodes:             creationCookie.Nodes,
			MiniblockNum:      creationCookie.MiniblockNum + 1,
			PrevMiniblockHash: mbHash,
		},
	}), nil
}

func (s *Service) getGenesisMediaEvent(ctx context.Context, streamId StreamId) (*StreamEvent, error) {
	mbs, _, err := s.storage.ReadMiniblocks(ctx, streamId, 0, 1, true)
	if err != nil {
		return nil, err
	}

	if len(mbs) == 0 {
		return nil, RiverError(Err_NOT_FOUND, "Genesis miniblock not found")
	}

	var mb Miniblock
	if err = proto.Unmarshal(mbs[0].Data, &mb); err != nil {
		return nil, err
	}

	var mediaEvent StreamEvent
	if err = proto.Unmarshal(mb.GetEvents()[0].Event, &mediaEvent); err != nil {
		return nil, RiverErrorWithBase(Err_INTERNAL, "Failed to decode stream event from genesis miniblock", err)
	}

	if mediaEvent.GetMediaPayload().GetInception() == nil {
		return nil, RiverError(Err_INTERNAL, "Genesis stream event does not have a media inception")
	}

	return &mediaEvent, nil
}
