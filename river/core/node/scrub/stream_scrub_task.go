package scrub

import (
	"context"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/gammazero/workerpool"
	"github.com/prometheus/client_golang/prometheus"

	"go.opentelemetry.io/otel/attribute"
	otelCodes "go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/node/auth"
	"github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/events"
	"github.com/river-build/river/core/node/infra"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
)

type StreamScrubTaskProcessor interface {
	// TryScheduleScrub schedules a stream scrub task iff:
	//
	// - the stream is a channel stream,
	//
	// - the stream has not been recently scrubbed, and
	//
	// - there is no pending scrub for the given stream.
	//
	// If force is set to true, a scrub will be scheduled even if the stream was recently scrubbed.
	TryScheduleScrub(ctx context.Context, stream events.SyncStream, force bool) (bool, error)
}

type EventAdder interface {
	AddEventPayload(ctx context.Context, streamId StreamId, payload IsStreamEvent_Payload) error
}

type streamScrubTaskProcessorImpl struct {
	ctx          context.Context
	pendingTasks sync.Map
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

func NewStreamScrubTasksProcessor(
	ctx context.Context,
	cache events.StreamCache,
	eventAdder EventAdder,
	chainAuth auth.ChainAuth,
	cfg *config.Config,
	metrics infra.MetricsFactory,
	tracer trace.Tracer,
	nodeAddress common.Address,
) (StreamScrubTaskProcessor, error) {
	proc := &streamScrubTaskProcessorImpl{
		ctx:        ctx,
		cache:      cache,
		workerPool: workerpool.New(100),
		eventAdder: eventAdder,
		chainAuth:  chainAuth,
		config:     cfg,

		tracer: tracer,
	}

	if metrics != nil {
		streamsScrubbed := metrics.NewCounterEx(
			"streams_scrubbed",
			"Number of streams scrubbed",
		)
		membership_checks := metrics.NewCounterEx(
			"membership_checks",
			"Number of channel membership checks performed during stream scrubbing",
		)
		entitlementLosses := metrics.NewCounterEx(
			"entitlement_losses",
			"Number of entitlement losses detected",
		)
		userBoots := metrics.NewCounterEx(
			"user_boots",
			"Number of users booted due to stream scrubbing",
		)
		scrubQueueLength := metrics.NewGaugeFunc(
			prometheus.GaugeOpts{
				Name: "scrub_queue_length",
				Help: "Number of streams with a pending scrub scheduled",
			},
			func() float64 {
				return float64(proc.workerPool.WaitingQueueSize())
			},
		)
		proc.scrubQueueLength = scrubQueueLength
		proc.streamsScrubbed = streamsScrubbed
		proc.membershipChecks = membership_checks
		proc.entitlementLosses = entitlementLosses
		proc.userBoots = userBoots
	}

	return proc, nil
}

// processMember checks the individual member for entitlement and attempts to boot them if
// they no longer meet entitlement requirements. This method returns an error for the sake
// of annotating the telemetry span, but in practice it is not used by the caller.
func (tp *streamScrubTaskProcessorImpl) processMember(
	task *streamScrubTask,
	ctx context.Context,
	member string,
) (err error) {
	log := dlog.FromCtx(ctx).
		With("Func", "streamScrubTask.processMember").
		With("channelId", task.channelId).
		With("spaceId", task.spaceId).
		With("userId", member)

	var span trace.Span

	if tp.tracer != nil {
		ctx, span = tp.tracer.Start(ctx, "member_scrub")
		span.SetAttributes(
			attribute.String("spaceId", task.spaceId.String()),
			attribute.String("channelId", task.channelId.String()),
			attribute.String("userId", member),
		)
		defer func() {
			span.RecordError(err)
			if err != nil {
				span.SetStatus(otelCodes.Error, err.Error())
			} else {
				span.SetStatus(otelCodes.Ok, "")
			}
			span.End()
		}()
	}

	var isEntitled bool
	if isEntitled, err = tp.chainAuth.IsEntitled(
		ctx,
		tp.config,
		auth.NewChainAuthArgsForChannel(
			task.spaceId,
			task.channelId,
			member,
			auth.PermissionRead,
		),
	); err != nil {
		err = base.AsRiverError(err).
			Message("unable to evaluate user entitlement").
			Func("StreamScrubTaskProcessor.processMember").
			Tag("user", member).
			LogError(log)
		return
	}

	if span != nil {
		span.SetAttributes(attribute.Bool("isEntitled", isEntitled))
	}

	// In the case that the user is not entitled, they must have lost their entitlement
	// after joining the channel, so let's go ahead and boot them.
	if !isEntitled {
		if tp.entitlementLosses != nil {
			tp.entitlementLosses.Inc()
		}

		var userId []byte
		if userId, err = AddressFromUserId(member); err != nil {
			err = base.AsRiverError(err).
				Message("error converting user id into address").
				Func("StreamScrubTaskProcessor.processMember").
				Tag("user", member).
				LogError(log)
			return
		}

		var userStreamId StreamId
		if userStreamId, err = UserStreamIdFromBytes(userId); err != nil {
			err = base.AsRiverError(err).
				Message("error constructing userid stream from user address").
				Func("StreamScrubTaskProcessor.processMember").
				Tag("userId", userId).
				LogError(log)
			return
		}

		log.Info("Entitlement loss detected; adding LEAVE event for user",
			"user",
			member,
			"userStreamId",
			userStreamId,
		)

		if err = tp.eventAdder.AddEventPayload(
			ctx,
			userStreamId,
			events.Make_UserPayload_Membership(
				MembershipOp_SO_LEAVE,
				task.channelId,
				&member,
				task.spaceId[:],
			),
		); err != nil {
			err = base.AsRiverError(err).
				Message("unable to add channel leave event to user stream").
				Func("StreamScrubTaskProcessor.processMember").
				Tag("userStreamId", userStreamId).
				LogError(log)
			return
		}

		if tp.userBoots != nil {
			tp.userBoots.Inc()
		}
	}

	if tp.membershipChecks != nil {
		tp.membershipChecks.Inc()
	}

	return err
}

func (tp *streamScrubTaskProcessorImpl) processTask(task *streamScrubTask) {
	log := dlog.FromCtx(tp.ctx).
		With("Func", "streamScrubTask.process").
		With("channelId", task.channelId).
		With("spaceId", task.spaceId)
	var span trace.Span
	ctx := tp.ctx
	if tp.tracer != nil {
		ctx, span = tp.tracer.Start(tp.ctx, "streamScrubTaskProcess.processTask")
		span.SetAttributes(
			attribute.String("spaceId", task.spaceId.String()),
			attribute.String("channelId", task.channelId.String()),
		)
		defer span.End()
	}

	stream, err := tp.cache.GetStream(tp.ctx, task.channelId)
	if err != nil {
		log.Error("Unable to get stream from cache", "error", err)
		return
	}

	view, err := stream.GetView(tp.ctx)
	if err != nil {
		log.Error(
			"Unable to scrub stream; could not fetch stream view",
			"error",
			err,
		)
		return
	}

	joinableView, ok := view.(events.JoinableStreamView)
	if !ok {
		log.Error("Unable to scrub stream; could not cast view to JoinableStreamView")
		return
	}

	members, err := joinableView.GetChannelMembers()
	if err != nil {
		log.Error("Failed to fetch stream members", "error", err)
		return
	}

	for member := range (*members).Iter() {
		_ = tp.processMember(task, ctx, member)
	}

	if span != nil {
		span.SetStatus(otelCodes.Ok, "")
	}

	if tp.streamsScrubbed != nil {
		tp.streamsScrubbed.Inc()
	}
}

type streamScrubTask struct {
	channelId     StreamId
	spaceId       StreamId
	taskProcessor *streamScrubTaskProcessorImpl
}

func (t *streamScrubTask) process() {
	t.taskProcessor.processTask(t)
}

// TryScheduleScrub schedules a stream scrub task if:
// - the stream is a channel stream,
// - the stream has not been recently scrubbed, and
// - there is no pending scrub for the given stream.
// The force parameter will schedule a scrub even if the stream was recently scrubbed.
// If the worker pool is full, the method will not block but will return an error.
// This is so that we don't affect ability to post updates to channels with stale scrubs
// whenever the node falls behind due to high scrubbing volume.
// Note: if we ever scrub spaces, we'll need to make sure we kick the user from all channels
// in the space before kicking them out of the space.
func (tp *streamScrubTaskProcessorImpl) TryScheduleScrub(
	ctx context.Context,
	stream events.SyncStream,
	force bool,
) (bool, error) {
	log := dlog.FromCtx(ctx).With("Func", "TryScheduleScrub")

	view, err := stream.GetView(ctx)
	if err != nil {
		log.Warn("Unable to get view from SyncStream", "stream", stream)
		return false, err
	}

	streamId := view.StreamId()
	log = log.With("streamId", streamId)

	// Note: This check ensures we are only scrubbing channels. If we ever scrub spaces,
	// we'll need to make sure we kick the user from all channels in the space before
	// kicking them out of the space.
	if !ValidChannelStreamId(streamId) {
		return false, nil
	}

	if !force && time.Since(stream.LastScrubbedTime()) < tp.config.Scrubbing.ScrubEligibleDuration {
		return false, nil
	}

	task := &streamScrubTask{channelId: *streamId, spaceId: *view.StreamParentId(), taskProcessor: tp}
	_, alreadyScheduled := tp.pendingTasks.LoadOrStore(streamId, task)
	if !alreadyScheduled {
		log.Debug("Scheduling scrub for stream", "lastScrubbedTime", stream.LastScrubbedTime())
		tp.workerPool.Submit(func() {
			task.process()
			tp.pendingTasks.Delete(task.channelId)
			stream.MarkScrubbed(ctx)
		})
	}

	return !alreadyScheduled, nil
}
