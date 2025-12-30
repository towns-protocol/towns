package rpc

import (
	"context"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/auth"
	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	rpcHeaders "github.com/towns-protocol/towns/core/node/rpc/headers"
	"github.com/towns-protocol/towns/core/node/rpc/highusage"
	"github.com/towns-protocol/towns/core/node/rules"
	. "github.com/towns-protocol/towns/core/node/shared"
)

func (s *Service) localAddEvent(
	ctx context.Context,
	req *connect.Request[AddEventRequest],
	streamId StreamId,
	localStream *Stream,
	streamView *StreamView,
) (*connect.Response[AddEventResponse], error) {
	log := logging.FromCtx(ctx)

	parsedEvent, err := ParseEvent(req.Msg.Event)
	if err != nil {
		return nil, AsRiverError(err).Func("localAddEvent")
	}

	log.Debugw("localAddEvent", "parsedEvent", parsedEvent)

	if parsedEvent.MiniblockRef.Num >= 0 {
		streamView, err = s.ensureStreamIsUpToDate(ctx, streamView, parsedEvent, localStream)
		if err != nil {
			return nil, err
		}
	}

	newEvents, err := s.addParsedEvent(ctx, streamId, parsedEvent, localStream, streamView)
	if err != nil {
		err = AsRiverError(err).Func("localAddEvent").Tags(
			"eventMiniblock", parsedEvent.MiniblockRef,
			"lastLocalMiniblock", streamView.LastBlock().Ref,
		)
	}

	if err != nil {
		return nil, err
	}

	s.callRateMonitor.RecordCall(parsedEvent.Event.CreatorAddress, time.Now(), highusage.CallTypeEvent)

	return connect.NewResponse(&AddEventResponse{
		NewEvents: newEvents,
	}), nil
}

// ensureStreamIsUpToDate returns the StreamView for the given StreamId that is up to date enough to
// add the given parsedEvent.
func (s *Service) ensureStreamIsUpToDate(
	ctx context.Context,
	streamView *StreamView,
	parsedEvent *ParsedEvent,
	localStream *Stream,
) (*StreamView, error) {
	retryCount := 0
	backoff := BackoffTracker{
		NextDelay:  100 * time.Millisecond,
		Multiplier: 2,
		Divisor:    1,
	}
	var err error

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	for {
		stats := streamView.GetStats()
		streamUpToDate := stats.LastMiniblockNum >= parsedEvent.MiniblockRef.Num
		if streamUpToDate {
			return streamView, nil
		}

		retryCount++
		if retryCount == 5 { // schedules task after 100ms + 200ms + 400ms + 800ms = 1500ms
			s.cache.SubmitReconcileStreamTask(localStream, nil)
		}

		if err := backoff.Wait(ctx, RiverError(Err_BAD_BLOCK_NUMBER, "Stream out-of-sync",
			"streamBlockNum", stats.LastMiniblockNum,
			"eventBlockNum", parsedEvent.MiniblockRef.Num)); err != nil {
			return nil, err
		}

		streamView, err = localStream.GetViewIfLocal(ctx)
		if err != nil {
			return nil, err
		}
	}
}

func (s *Service) addParsedEvent(
	ctx context.Context,
	streamId StreamId,
	parsedEvent *ParsedEvent,
	localStream *Stream,
	streamView *StreamView,
) ([]*EventRef, error) {
	// TODO: REPLICATION: FIX: here it should loop and re-check the rules if view was updated in the meantime.
	canAddEvent, verifications, sideEffects, err := rules.CanAddEvent(
		ctx,
		*s.config,
		s.chainConfig,
		s.nodeRegistry.GetValidNodeAddresses(),
		time.Now(),
		parsedEvent,
		streamView,
	)
	if err != nil {
		if IsRiverErrorCode(err, Err_DUPLICATE_EVENT) {
			// TODO: REPLICATION: FIX: implement returning relevant EventRefs here. How are they used in SDK?
			return nil, nil
		}
		return nil, err
	}

	// if no errors, but canAddEvent is false, return nil, nil - this was a no-op idempotent operation
	if !canAddEvent {
		return nil, nil
	}

	if len(verifications.OneOfChainAuths) > 0 {
		var isEntitledResult auth.IsEntitledResult
		var err error
		// Determine if any chainAuthArgs grant entitlement
		for _, chainAuthArgs := range verifications.OneOfChainAuths {
			isEntitledResult, err = s.chainAuth.IsEntitled(ctx, s.config, chainAuthArgs)
			if err != nil {
				return nil, err
			}
			if isEntitledResult.IsEntitled() {
				break
			}
		}
		// If no chainAuthArgs grant entitlement, execute the OnChainAuthFailure side effect.
		if !isEntitledResult.IsEntitled() {
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
				"reason", isEntitledResult.Reason().String(),
				"chainAuthArgsList",
				verifications.OneOfChainAuths,
			).Func("addParsedEvent")
		}
	}

	if verifications.Receipt != nil {
		isVerified, err := s.chainAuth.VerifyReceipt(ctx, verifications.Receipt)
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

	err = s.replicatedAddEvent(ctx, localStream, parsedEvent)
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

	addReq := connect.NewRequest(req)
	if s.config.TestEntitlementsBypassSecret != "" && auth.IsTestEntitlementBypassEnabled(ctx) {
		addReq.Header().Set(rpcHeaders.RiverTestBypassHeaderName, s.config.TestEntitlementsBypassSecret)
	}
	resp, err := s.AddEvent(ctx, addReq)
	if err != nil {
		return nil, err
	}

	if resp.Msg != nil {
		return resp.Msg.NewEvents, nil
	}

	return nil, nil
}
