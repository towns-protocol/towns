package scrub

import (
	"context"

	"github.com/ethereum/go-ethereum/common"
	"github.com/gammazero/workerpool"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/puzpuzpuz/xsync/v4"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/auth"
	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type EventAdder interface {
	AddEventPayload(
		ctx context.Context,
		streamId StreamId,
		payload IsStreamEvent_Payload,
		tags *Tags,
	) ([]*EventRef, error)
	GetWalletAddress() common.Address
}

type streamMembershipScrubTaskProcessorImpl struct {
	ctx          context.Context
	pendingTasks *xsync.Map[StreamId, bool]
	workerPool   *workerpool.WorkerPool
	cache        *StreamCache
	eventAdder   EventAdder
	chainAuth    auth.ChainAuth
	config       *config.Config
	tracer       trace.Tracer

	streamsScrubbed   prometheus.Counter
	membershipChecks  prometheus.Counter
	entitlementLosses prometheus.Counter
	userBoots         prometheus.Counter
	scrubQueueLength  prometheus.GaugeFunc
}

var _ Scrubber = (*streamMembershipScrubTaskProcessorImpl)(nil)

func NewStreamMembershipScrubTasksProcessor(
	ctx context.Context,
	cache *StreamCache,
	eventAdder EventAdder,
	chainAuth auth.ChainAuth,
	cfg *config.Config,
	metrics infra.MetricsFactory,
	tracer trace.Tracer,
) *streamMembershipScrubTaskProcessorImpl {
	proc := &streamMembershipScrubTaskProcessorImpl{
		ctx:          ctx,
		cache:        cache,
		pendingTasks: xsync.NewMap[StreamId, bool](),
		workerPool:   workerpool.New(100),
		eventAdder:   eventAdder,
		chainAuth:    chainAuth,
		config:       cfg,
		tracer:       tracer,
	}

	go func() {
		<-ctx.Done()
		proc.workerPool.Stop()
	}()

	proc.streamsScrubbed = metrics.NewCounterEx(
		"streams_scrubbed",
		"Number of streams scrubbed",
	)
	proc.membershipChecks = metrics.NewCounterEx(
		"membership_checks",
		"Number of channel membership checks performed during stream scrubbing",
	)
	proc.entitlementLosses = metrics.NewCounterEx(
		"entitlement_losses",
		"Number of entitlement losses detected",
	)
	proc.userBoots = metrics.NewCounterEx(
		"user_boots",
		"Number of users booted due to stream scrubbing",
	)
	proc.scrubQueueLength = metrics.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "scrub_queue_length",
			Help: "Number of streams with a pending scrub scheduled",
		},
		func() float64 {
			return float64(proc.workerPool.WaitingQueueSize())
		},
	)

	return proc
}

// processSpaceMemberImpl checks the individual member for entitlement and attempts to boot them if
// they no longer meet entitlement requirements. This method returns an error for the sake
// of annotating the telemetry span, but in practice it is not used by the caller.
func (tp *streamMembershipScrubTaskProcessorImpl) processSpaceMemberImpl(
	ctx context.Context,
	spaceId StreamId,
	memberAddress common.Address,
	appAddress common.Address,
	span trace.Span,
) error {
	log := logging.FromCtx(ctx)
	tp.membershipChecks.Inc()

	isEntitledResult, err := tp.chainAuth.IsEntitled(
		ctx,
		tp.config,
		auth.NewChainAuthArgsForIsSpaceMember(
			spaceId,
			memberAddress,
			appAddress,
		),
	)
	if err != nil {
		return err
	}

	if span != nil {
		span.SetAttributes(attribute.Bool("isEntitled", isEntitledResult.IsEntitled()))
	}

	// In the case that the user is not entitled, they must have lost their entitlement
	// after joining the space, so let's go ahead and boot them.
	if !isEntitledResult.IsEntitled() {
		tp.entitlementLosses.Inc()

		userStreamId := UserStreamIdFromAddr(memberAddress)

		reason := entitlementResultReasonToMembershipReason(isEntitledResult.Reason())

		log.Debugw("Entitlement loss detected for space; adding LEAVE event for user",
			"memberAddress",
			memberAddress,
			"appAddress",
			appAddress,
			"userStreamId",
			userStreamId,
			"spaceId",
			spaceId,
			"reason",
			reason,
		)

		if _, err = tp.eventAdder.AddEventPayload(
			ctx,
			userStreamId,
			Make_UserPayload_Membership(
				MembershipOp_SO_LEAVE,
				spaceId,
				tp.eventAdder.GetWalletAddress(),
				nil,
				&reason,
			),
			nil,
		); err != nil {
			return err
		}

		// If userBoots diverges from entitlementLosses, we know that some users did lose their
		// entitlements but the server was unable to boot them.
		tp.userBoots.Inc()
	}

	return nil
}

// processMemberImpl checks the individual member for entitlement and attempts to boot them if
// they no longer meet entitlement requirements. This method returns an error for the sake
// of annotating the telemetry span, but in practice it is not used by the caller.
func (tp *streamMembershipScrubTaskProcessorImpl) processMemberImpl(
	ctx context.Context,
	channelId StreamId,
	memberAddress common.Address,
	appAddress common.Address,
	span trace.Span,
) error {
	log := logging.FromCtx(ctx)
	tp.membershipChecks.Inc()

	spaceId := channelId.SpaceID()
	isEntitledResult, err := tp.chainAuth.IsEntitled(
		ctx,
		tp.config,
		auth.NewChainAuthArgsForChannel(
			spaceId,
			channelId,
			memberAddress,
			auth.PermissionRead,
			appAddress,
		),
	)
	if err != nil {
		return err
	}

	if span != nil {
		span.SetAttributes(attribute.Bool("isEntitled", isEntitledResult.IsEntitled()))
	}

	// In the case that the user is not entitled, they must have lost their entitlement
	// after joining the channel, so let's go ahead and boot them.
	if !isEntitledResult.IsEntitled() {
		tp.entitlementLosses.Inc()

		userStreamId := UserStreamIdFromAddr(memberAddress)

		reason := entitlementResultReasonToMembershipReason(isEntitledResult.Reason())

		log.Debugw("Entitlement loss detected; adding LEAVE event for user",
			"memberAddress",
			memberAddress,
			"appAddress",
			appAddress,
			"userStreamId",
			userStreamId,
			"channelId",
			channelId,
			"spaceId",
			spaceId,
			"reason",
			reason,
		)

		if _, err = tp.eventAdder.AddEventPayload(
			ctx,
			userStreamId,
			Make_UserPayload_Membership(
				MembershipOp_SO_LEAVE,
				channelId,
				tp.eventAdder.GetWalletAddress(),
				&reason,
			),
			nil,
		); err != nil {
			return err
		}

		// If userBoots diverges from entitlementLosses, we know that some users did lose their
		// entitlements but the server was unable to boot them.
		tp.userBoots.Inc()
	}

	return nil
}

func (tp *streamMembershipScrubTaskProcessorImpl) processSpaceMembership(
	ctx context.Context,
	spaceId StreamId,
	memberAddress common.Address,
	appAddress common.Address,
) {
	var span trace.Span
	if tp.tracer != nil {
		ctx, span = tp.tracer.Start(ctx, "space_member_scrub")
		span.SetAttributes(
			attribute.String("spaceId", spaceId.String()),
			attribute.String("userId", memberAddress.Hex()),
			attribute.String("appAddress", appAddress.Hex()),
		)
		defer span.End()
	}

	err := tp.processSpaceMemberImpl(ctx, spaceId, memberAddress, appAddress, span)
	if err != nil {
		logging.FromCtx(ctx).
			Warnw("Failed to scrub space member", "spaceId", spaceId, "memberAddress", memberAddress, "error", err)
	}

	if span != nil {
		if err == nil {
			span.SetStatus(codes.Ok, "")
		} else {
			span.SetStatus(codes.Error, err.Error())
			span.RecordError(err)
		}
	}
}

func (tp *streamMembershipScrubTaskProcessorImpl) processMembership(
	ctx context.Context,
	channelId StreamId,
	memberAddress common.Address,
	appAddress common.Address,
) {
	spaceId := channelId.SpaceID()

	var span trace.Span
	if tp.tracer != nil {
		ctx, span = tp.tracer.Start(ctx, "member_scrub")
		span.SetAttributes(
			attribute.String("spaceId", spaceId.String()),
			attribute.String("channelId", channelId.String()),
			attribute.String("userId", memberAddress.Hex()),
			attribute.String("appAddress", appAddress.Hex()),
		)
		defer span.End()
	}

	err := tp.processMemberImpl(ctx, channelId, memberAddress, appAddress, span)
	if err != nil {
		logging.FromCtx(ctx).
			Errorw("Failed to scrub member", "channelId", channelId, "memberAddress", memberAddress, "appAddress", appAddress, "error", err)
	}

	if span != nil {
		if err == nil {
			span.SetStatus(codes.Ok, "")
		} else {
			span.SetStatus(codes.Error, err.Error())
			span.RecordError(err)
		}
	}
}

func (tp *streamMembershipScrubTaskProcessorImpl) processStream(streamID StreamId) {
	ctx := tp.ctx

	var span trace.Span
	if tp.tracer != nil {
		ctx, span = tp.tracer.Start(tp.ctx, "streamScrubTaskProcess.processTask")
		span.SetAttributes(
			attribute.String("channelId", streamID.String()),
		)
		defer span.End()
	}

	err := tp.processStreamImpl(ctx, streamID)
	if err != nil {
		logging.FromCtx(ctx).Warnw("Failed to scrub stream", "streamId", streamID, "error", err)
	}

	if span != nil {
		if err == nil {
			span.SetStatus(codes.Ok, "")
		} else {
			span.SetStatus(codes.Error, err.Error())
			span.RecordError(err)
		}
	}

	tp.streamsScrubbed.Inc()
}

func (tp *streamMembershipScrubTaskProcessorImpl) processStreamImpl(
	ctx context.Context,
	streamId StreamId,
) error {
	isChannelStream := ValidChannelStreamId(&streamId)
	isSpaceStream := ValidSpaceStreamId(&streamId)
	if !isChannelStream && !isSpaceStream {
		return RiverError(Err_INTERNAL, "Scrub scheduled for non-channel-or-space stream", "streamId", streamId)
	}

	stream, err := tp.cache.GetStreamNoWait(ctx, streamId)
	if err != nil {
		return err
	}

	view, err := stream.GetViewIfLocal(tp.ctx)
	if err != nil {
		return err
	}
	if view == nil {
		return RiverError(Err_INTERNAL, "Scrub scheduled for non-local stream", "streamId", streamId)
	}

	members, err := view.GetChannelMembers()
	if err != nil {
		return err
	}

	for member := range members.Iter() {
		memberAddress := common.HexToAddress(member)
		appAddress, err := view.GetMemberAppAddress(memberAddress)
		if err != nil {
			logging.FromCtx(ctx).
				Errorw(
					"Error deriving member app address from stream during membership scrub",
					"error",
					err,
					"userId",
					memberAddress,
					"streamId",
					streamId,
				)
		} else {
			if isChannelStream {
				tp.processMembership(ctx, streamId, memberAddress, appAddress)
			} else if isSpaceStream {
				tp.processSpaceMembership(ctx, streamId, memberAddress, appAddress)
			} else {
				// should never happen
				return RiverError(Err_INTERNAL, "Logic error in stream membership scrub", "streamId", streamId)
			}
		}
	}

	return nil
}

func (tp *streamMembershipScrubTaskProcessorImpl) Scrub(channelId StreamId) bool {
	_, wasScheduled := tp.pendingTasks.LoadOrCompute(
		channelId,
		func() (newValue bool, cancel bool) {
			tp.workerPool.Submit(func() {
				tp.processStream(channelId)
				tp.pendingTasks.Delete(channelId)
			})
			return true, false
		},
	)
	return !wasScheduled
}

func entitlementResultReasonToMembershipReason(entitlementResultReason auth.EntitlementResultReason) MembershipReason {
	if entitlementResultReason == auth.EntitlementResultReason_MEMBERSHIP_EXPIRED {
		return MembershipReason_MR_EXPIRED
	}
	return MembershipReason_MR_NOT_ENTITLED
}
