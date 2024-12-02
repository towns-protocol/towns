package scrub

import (
	"context"

	"github.com/gammazero/workerpool"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/puzpuzpuz/xsync/v3"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/node/auth"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/events"
	"github.com/river-build/river/core/node/infra"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
)

type EventAdder interface {
	AddEventPayload(ctx context.Context, streamId StreamId, payload IsStreamEvent_Payload) error
}

type streamScrubTaskProcessorImpl struct {
	ctx          context.Context
	pendingTasks *xsync.MapOf[StreamId, bool]
	workerPool   *workerpool.WorkerPool
	cache        events.StreamCache
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

var _ events.Scrubber = (*streamScrubTaskProcessorImpl)(nil)

func NewStreamScrubTasksProcessor(
	ctx context.Context,
	cache events.StreamCache,
	eventAdder EventAdder,
	chainAuth auth.ChainAuth,
	cfg *config.Config,
	metrics infra.MetricsFactory,
	tracer trace.Tracer,
) *streamScrubTaskProcessorImpl {
	proc := &streamScrubTaskProcessorImpl{
		ctx:          ctx,
		cache:        cache,
		pendingTasks: xsync.NewMapOf[StreamId, bool](),
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

// processMember checks the individual member for entitlement and attempts to boot them if
// they no longer meet entitlement requirements. This method returns an error for the sake
// of annotating the telemetry span, but in practice it is not used by the caller.
func (tp *streamScrubTaskProcessorImpl) processMemberImpl(
	ctx context.Context,
	channelId StreamId,
	member string,
	span trace.Span,
) error {
	log := dlog.FromCtx(ctx)
	tp.membershipChecks.Inc()

	spaceId := channelId.SpaceID()
	isEntitled, err := tp.chainAuth.IsEntitled(
		ctx,
		tp.config,
		auth.NewChainAuthArgsForChannel(
			spaceId,
			channelId,
			member,
			auth.PermissionRead,
		),
	)
	if err != nil {
		return err
	}

	if span != nil {
		span.SetAttributes(attribute.Bool("isEntitled", isEntitled))
	}

	// In the case that the user is not entitled, they must have lost their entitlement
	// after joining the channel, so let's go ahead and boot them.
	if !isEntitled {
		tp.entitlementLosses.Inc()

		userId, err := AddressFromUserId(member)
		if err != nil {
			return err
		}

		userStreamId, err := UserStreamIdFromBytes(userId)
		if err != nil {
			return err
		}

		log.Debug("Entitlement loss detected; adding LEAVE event for user",
			"user",
			member,
			"userStreamId",
			userStreamId,
			"channelId",
			channelId,
			"spaceId",
			spaceId,
		)

		err = tp.eventAdder.AddEventPayload(
			ctx,
			userStreamId,
			events.Make_UserPayload_Membership(
				MembershipOp_SO_LEAVE,
				channelId,
				&member,
				spaceId[:],
			),
		)
		if err != nil {
			return err
		}

		tp.userBoots.Inc()
	}

	return nil
}

func (tp *streamScrubTaskProcessorImpl) processMember(
	ctx context.Context,
	channelId StreamId,
	member string,
) {
	spaceId := channelId.SpaceID()

	var span trace.Span
	if tp.tracer != nil {
		ctx, span = tp.tracer.Start(ctx, "member_scrub")
		span.SetAttributes(
			attribute.String("spaceId", spaceId.String()),
			attribute.String("channelId", channelId.String()),
			attribute.String("userId", member),
		)
		defer span.End()
	}

	err := tp.processMemberImpl(ctx, channelId, member, span)
	if err != nil {
		dlog.FromCtx(ctx).Warn("Failed to scrub member", "channelId", channelId, "member", member, "error", err)
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

func (tp *streamScrubTaskProcessorImpl) processTask(streamID StreamId) {
	ctx := tp.ctx

	var span trace.Span
	if tp.tracer != nil {
		ctx, span = tp.tracer.Start(tp.ctx, "streamScrubTaskProcess.processTask")
		span.SetAttributes(
			attribute.String("channelId", streamID.String()),
		)
		defer span.End()
	}

	err := tp.processTaskImpl(ctx, streamID)
	if err != nil {
		dlog.FromCtx(ctx).Warn("Failed to scrub stream", "streamId", streamID, "error", err)
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

func (tp *streamScrubTaskProcessorImpl) processTaskImpl(
	ctx context.Context,
	streamId StreamId,
) error {
	if !ValidChannelStreamId(&streamId) {
		return RiverError(Err_INTERNAL, "Scrub schedule for non-channel stream", "streamId", streamId)
	}

	stream, err := tp.cache.GetStream(ctx, streamId)
	if err != nil {
		return err
	}

	// TODO: GetViewIfLocal
	view, err := stream.GetView(tp.ctx)
	if err != nil {
		return err
	}

	joinableView, ok := view.(events.JoinableStreamView)
	if !ok {
		return RiverError(Err_INTERNAL, "Unable to scrub stream; could not cast view to JoinableStreamView")
	}

	members, err := joinableView.GetChannelMembers()
	if err != nil {
		return err
	}

	for member := range (*members).Iter() {
		tp.processMember(ctx, streamId, member)
	}

	return nil
}

func (tp *streamScrubTaskProcessorImpl) Scrub(channelId StreamId) bool {
	_, wasScheduled := tp.pendingTasks.LoadOrCompute(channelId, func() bool {
		tp.workerPool.Submit(func() {
			tp.processTask(channelId)
			tp.pendingTasks.Delete(channelId)
		})
		return true
	})
	return !wasScheduled
}
