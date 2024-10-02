package scrub

import (
	"context"
	"sync"
	"time"

	"github.com/gammazero/workerpool"

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/node/auth"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/events"
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
	TryScheduleScrub(ctx context.Context, streamId StreamId, force bool) (bool, error)
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
}

func NewStreamScrubTasksProcessor(
	ctx context.Context,
	cache events.StreamCache,
	eventAdder EventAdder,
	chainAuth auth.ChainAuth,
	cfg *config.Config,
) (StreamScrubTaskProcessor, error) {
	proc := &streamScrubTaskProcessorImpl{
		ctx:        ctx,
		cache:      cache,
		workerPool: workerpool.New(100),
		eventAdder: eventAdder,
		chainAuth:  chainAuth,
		config:     cfg,
	}
	return proc, nil
}

func (tp *streamScrubTaskProcessorImpl) processTask(task *streamScrubTask) {
	log := dlog.FromCtx(tp.ctx).
		With("Func", "streamScrubTask.process").
		With("channelId", task.channelId).
		With("spaceId", task.spaceId)
	_, view, err := tp.cache.GetStream(tp.ctx, task.channelId)
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
		isEntitled, err := tp.chainAuth.IsEntitled(
			tp.ctx,
			tp.config,
			auth.NewChainAuthArgsForChannel(
				task.spaceId,
				task.channelId,
				member,
				auth.PermissionRead,
			),
		)
		if err != nil {
			log.Error("Scrubbing error: unable to evaluate user entitlement",
				"user",
				member,
				"error",
				err,
			)
			continue
		}
		// In the case that the user is not entitled, they must have lost their entitlement
		// after joining the channel, so let's go ahead and boot them.
		if !isEntitled {
			userId, err := AddressFromUserId(member)
			if err != nil {
				log.Error("Error converting user id into address", "member", member, "error", err)
				continue
			}
			userStreamId, err := UserStreamIdFromBytes(userId)
			if err != nil {
				log.Error(
					"Error constructing user id stream from user address",
					"userAddress",
					userId,
					"error",
					err,
				)
			}
			log.Info("Entitlement loss detected; adding LEAVE event for user",
				"user",
				member,
				"userStreamId",
				userStreamId,
			)
			err = tp.eventAdder.AddEventPayload(
				tp.ctx,
				userStreamId,
				events.Make_UserPayload_Membership(
					MembershipOp_SO_LEAVE,
					task.channelId,
					&member,
					task.spaceId[:],
				),
			)
			if err != nil {
				log.Error(
					"scrub error: unable to add channel leave event to user stream",
					"userStreamId",
					userStreamId,
					"error",
					err,
				)
			}
		}
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
	streamId StreamId,
	force bool,
) (bool, error) {
	log := dlog.FromCtx(ctx).With("Func", "TryScheduleScrub").With("streamId", streamId)
	// Note: This check ensures we are only scrubbing channels. If we ever scrub spaces,
	// we'll need to make sure we kick the user from all channels in the space before
	// kicking them out of the space.
	if !ValidChannelStreamId(&streamId) {
		return false, nil
	}

	stream, view, err := tp.cache.GetStream(ctx, streamId)
	if err != nil {
		log.Warn("Unable to get stream from cache")
		return false, err
	}

	if !force && time.Since(stream.LastScrubbedTime()) < tp.config.Scrubbing.ScrubEligibleDuration {
		return false, nil
	}

	task := &streamScrubTask{channelId: streamId, spaceId: *view.StreamParentId(), taskProcessor: tp}
	_, alreadyScheduled := tp.pendingTasks.LoadOrStore(streamId, task)
	if !alreadyScheduled {
		log.Info("Scheduling scrub for stream", "lastScrubbedTime", stream.LastScrubbedTime())
		tp.workerPool.Submit(func() {
			task.process()
			tp.pendingTasks.Delete(task.channelId)
			stream.MarkScrubbed(ctx)
		})
	}

	return !alreadyScheduled, nil
}
