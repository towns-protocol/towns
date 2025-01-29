package rpc

import (
	"context"
	"time"

	"connectrpc.com/connect"

	"github.com/ethereum/go-ethereum/common"

	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/events"
	"github.com/river-build/river/core/node/logging"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/rules"
	. "github.com/river-build/river/core/node/shared"
)

func (s *Service) localAddEvent(
	ctx context.Context,
	req *connect.Request[AddEventRequest],
	localStream *Stream,
	streamView *StreamView,
) (*connect.Response[AddEventResponse], error) {
	log := logging.FromCtx(ctx)

	streamId, err := StreamIdFromBytes(req.Msg.StreamId)
	if err != nil {
		return nil, AsRiverError(err).Func("localAddEvent")
	}

	parsedEvent, err := ParseEvent(req.Msg.Event)
	if err != nil {
		return nil, AsRiverError(err).Func("localAddEvent")
	}

	log.Debugw("localAddEvent", "parsedEvent", parsedEvent)

	newEvents, err := s.addParsedEvent(ctx, streamId, parsedEvent, localStream, streamView)
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
			NewEvents: newEvents,
		}), nil
	} else if err != nil {
		return nil, AsRiverError(err).Func("localAddEvent")
	} else {
		return connect.NewResponse(&AddEventResponse{
			NewEvents: newEvents,
		}), nil
	}
}

func (s *Service) addParsedEvent(
	ctx context.Context,
	streamId StreamId,
	parsedEvent *ParsedEvent,
	localStream *Stream,
	streamView *StreamView,
) ([]*EventRef, error) {
	// TODO: here it should loop and re-check the rules if view was updated in the meantime.
	canAddEvent, verifications, sideEffects, err := rules.CanAddEvent(
		ctx,
		*s.config,
		s.chainConfig,
		s.nodeRegistry.GetValidNodeAddresses(),
		time.Now(),
		parsedEvent,
		streamView,
	)

	if !canAddEvent || err != nil {
		return nil, err
	}

	if len(verifications.OneOfChainAuths) > 0 {
		isEntitled := false
		var err error
		// Determine if any chainAuthArgs grant entitlement
		for _, chainAuthArgs := range verifications.OneOfChainAuths {
			isEntitled, err = s.chainAuth.IsEntitled(ctx, s.config, chainAuthArgs)
			if err != nil {
				return nil, err
			}
			if isEntitled {
				break
			}
		}
		// If no chainAuthArgs grant entitlement, execute the OnChainAuthFailure side effect.
		if !isEntitled {
			var newEvents []*EventRef = nil
			if sideEffects.OnChainAuthFailure != nil {
				newEvents, err = s.AddEventPayload(
					ctx,
					sideEffects.OnChainAuthFailure.StreamId,
					sideEffects.OnChainAuthFailure.Payload,
					sideEffects.OnChainAuthFailure.Tags,
				)
				if err != nil {
					return newEvents, err
				}
			}
			return newEvents, RiverError(
				Err_PERMISSION_DENIED,
				"IsEntitled failed",
				"chainAuthArgsList",
				verifications.OneOfChainAuths,
			).Func("addParsedEvent")
		}
	}

	if verifications.Receipt != nil {
		isVerified, err := s.chainAuth.VerifyReceipt(ctx, s.config, verifications.Receipt)
		if err != nil {
			return nil, err
		}
		if !isVerified {
			return nil, RiverError(
				Err_PERMISSION_DENIED,
				"VerifyReceipt failed",
				"receipt",
				verifications.Receipt,
			).Func("addParsedEvent")
		}
	}

	var newParentEvents []*EventRef = nil

	if sideEffects.RequiredParentEvent != nil {
		newParentEvents, err = s.AddEventPayload(
			ctx,
			sideEffects.RequiredParentEvent.StreamId,
			sideEffects.RequiredParentEvent.Payload,
			sideEffects.RequiredParentEvent.Tags,
		)
		if err != nil {
			return newParentEvents, err
		}
	}

	stream := &replicatedStream{
		streamId:    streamId.String(),
		localStream: localStream,
		nodes:       localStream,
		service:     s,
	}

	err = stream.AddEvent(ctx, parsedEvent)
	if err != nil {
		return newParentEvents, err
	}

	newEvents := make([]*EventRef, 0, len(newParentEvents)+1)

	if newParentEvents != nil {
		newEvents = append(newEvents, newParentEvents...)
	}

	newEvents = append(newEvents, &EventRef{
		StreamId:  streamId[:],
		Hash:      parsedEvent.Hash[:],
		Signature: parsedEvent.Envelope.Signature,
	})

	return newEvents, nil
}

func (s *Service) AddEventPayload(
	ctx context.Context,
	streamId StreamId,
	payload IsStreamEvent_Payload,
	tags *Tags,
) ([]*EventRef, error) {
	hashRequest := &GetLastMiniblockHashRequest{
		StreamId: streamId[:],
	}
	hashResponse, err := s.GetLastMiniblockHash(ctx, connect.NewRequest(hashRequest))
	if err != nil {
		return nil, err
	}
	envelope, err := MakeEnvelopeWithPayloadAndTags(s.wallet, payload, &MiniblockRef{
		Hash: common.BytesToHash(hashResponse.Msg.Hash),
		Num:  hashResponse.Msg.MiniblockNum,
	}, tags)
	if err != nil {
		return nil, err
	}

	req := &AddEventRequest{
		StreamId: streamId[:],
		Event:    envelope,
	}

	resp, err := s.AddEvent(ctx, connect.NewRequest(req))
	if err != nil {
		return nil, err
	}

	if resp.Msg != nil {
		return resp.Msg.NewEvents, nil
	}

	return nil, nil
}
