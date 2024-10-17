package rpc

import (
	"context"
	"time"

	"connectrpc.com/connect"

	"github.com/ethereum/go-ethereum/common"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/events"
	. "github.com/river-build/river/core/node/nodes"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/rules"
	. "github.com/river-build/river/core/node/shared"
)

func (s *Service) localAddEvent(
	ctx context.Context,
	req *connect.Request[AddEventRequest],
	nodes StreamNodes,
) (*connect.Response[AddEventResponse], error) {
	log := dlog.FromCtx(ctx)

	streamId, err := StreamIdFromBytes(req.Msg.StreamId)
	if err != nil {
		return nil, AsRiverError(err).Func("localAddEvent")
	}

	parsedEvent, err := ParseEvent(req.Msg.Event)
	if err != nil {
		return nil, AsRiverError(err).Func("localAddEvent")
	}

	log.Debug("localAddEvent", "parsedEvent", parsedEvent)

	err = s.addParsedEvent(ctx, streamId, parsedEvent, nodes)
	if err != nil && req.Msg.Optional {
		// aellis 5/2024 - we only want to wrap errors from canAddEvent,
		// currently this is catching all errors, which is not ideal
		riverError := AsRiverError(err).Func("localAddEvent")
		return connect.NewResponse(&AddEventResponse{
			Error: &AddEventResponse_Error{
				Code:  riverError.Code,
				Msg:   riverError.Error(),
				Funcs: riverError.Funcs,
			},
		}), nil
	} else if err != nil {
		return nil, AsRiverError(err).Func("localAddEvent")
	} else {
		return connect.NewResponse(&AddEventResponse{}), nil
	}
}

func (s *Service) addParsedEvent(
	ctx context.Context,
	streamId StreamId,
	parsedEvent *ParsedEvent,
	nodes StreamNodes,
) error {
	localStream, err := s.cache.GetStream(ctx, streamId)
	if err != nil {
		return err
	}

	streamView, err := localStream.GetView(ctx)
	if err != nil {
		return err
	}

	_, _ = s.scrubTaskProcessor.TryScheduleScrub(ctx, localStream, false)

	canAddEvent, chainAuthArgsList, sideEffects, err := rules.CanAddEvent(
		ctx,
		s.chainConfig,
		s.nodeRegistry.GetValidNodeAddresses(),
		time.Now(),
		parsedEvent,
		streamView,
	)

	if !canAddEvent || err != nil {
		return err
	}

	if len(chainAuthArgsList) > 0 {
		isEntitled := false
		var err error
		// Determine if any chainAuthArgs grant entitlement
		for _, chainAuthArgs := range chainAuthArgsList {
			isEntitled, err = s.chainAuth.IsEntitled(ctx, s.config, chainAuthArgs)
			if err != nil {
				return err
			}
			if isEntitled {
				break
			}
		}
		// If no chainAuthArgs grant entitlement, execute the OnChainAuthFailure side effect.
		if !isEntitled {
			if sideEffects.OnChainAuthFailure != nil {
				err := s.AddEventPayload(
					ctx,
					sideEffects.OnChainAuthFailure.StreamId,
					sideEffects.OnChainAuthFailure.Payload,
				)
				if err != nil {
					return err
				}
			}
			return RiverError(
				Err_PERMISSION_DENIED,
				"IsEntitled failed",
				"chainAuthArgsList",
				chainAuthArgsList,
			).Func("addParsedEvent")
		}
	}

	if sideEffects.RequiredParentEvent != nil {
		err := s.AddEventPayload(ctx, sideEffects.RequiredParentEvent.StreamId, sideEffects.RequiredParentEvent.Payload)
		if err != nil {
			return err
		}
	}

	stream := &replicatedStream{
		streamId:    streamId.String(),
		localStream: localStream,
		nodes:       nodes,
		service:     s,
	}

	err = stream.AddEvent(ctx, parsedEvent)
	if err != nil {
		return err
	}

	return nil
}

func (s *Service) AddEventPayload(ctx context.Context, streamId StreamId, payload IsStreamEvent_Payload) error {
	hashRequest := &GetLastMiniblockHashRequest{
		StreamId: streamId[:],
	}
	hashResponse, err := s.GetLastMiniblockHash(ctx, connect.NewRequest(hashRequest))
	if err != nil {
		return err
	}
	envelope, err := MakeEnvelopeWithPayload(s.wallet, payload, &MiniblockRef{
		Hash: common.BytesToHash(hashResponse.Msg.Hash),
		Num:  hashResponse.Msg.MiniblockNum,
	})
	if err != nil {
		return err
	}

	req := &AddEventRequest{
		StreamId: streamId[:],
		Event:    envelope,
	}

	_, err = s.AddEvent(ctx, connect.NewRequest(req))
	if err != nil {
		return err
	}
	return nil
}
