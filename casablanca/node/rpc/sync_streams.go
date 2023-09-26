package rpc

import (
	"casablanca/node/dlog"
	"casablanca/node/infra"
	. "casablanca/node/protocol"
	"context"

	. "casablanca/node/base"
	. "casablanca/node/events"

	connect_go "github.com/bufbuild/connect-go"
)

var (
	syncStreamsRequests   = infra.NewSuccessMetrics("sync_streams_requests", serviceRequests)
	syncStreamsResultSize = infra.NewCounter("sync_streams_result_size", "The total number of events returned by sync streams")
)

func addUpdatesToCounter(updates []*StreamAndCookie) {
	for _, stream := range updates {
		syncStreamsResultSize.Add(float64(len(stream.Events)))
	}
}

func (s *Service) SyncStreams(ctx context.Context, req *connect_go.Request[SyncStreamsRequest], stream *connect_go.ServerStream[SyncStreamsResponse]) error {
	ctx, log := ctxAndLogForRequest(ctx, req)

	log.Debug("SyncStreams: ENTER", "request", req.Msg)

	err := s.SyncLocalStreams(
		ctx,
		req.Msg.SyncPos,
		func(update *StreamAndCookie) error {
			updates := []*StreamAndCookie{update}
			addUpdatesToCounter(updates)
			return stream.Send(&SyncStreamsResponse{
				Streams: updates,
			})
		},
	)

	if err != nil {
		log.Warn("SyncStreams: ERROR", "error", err)
		syncStreamsRequests.Fail()
		return err
	}

	log.Debug("SyncStreams: LEAVE")
	syncStreamsRequests.Pass()
	return nil
}

// TODO: move to stream cache?
func (s *Service) SyncLocalStreams(ctx context.Context, syncPos []*SyncCookie, sendUpdate func(*StreamAndCookie) error) error {
	log := dlog.CtxLog(ctx)

	if len(syncPos) <= 0 {
		return RiverError(Err_INVALID_ARGUMENT, "SyncLocalStreams: SyncPos is empty")
	}

	receiver := make(chan *StreamAndCookie, 128) // TODO: setting, also may be proportional to number of requested streams.
	subs := make([]*Stream, 0, len(syncPos))
	defer func() {
		for _, sub := range subs {
			sub.Unsub(receiver)
		}
		close(receiver)
	}()

	for _, pos := range syncPos {
		err := SyncCookieValidate(pos)
		if err != nil {
			return nil
		}

		streamSub, _, err := s.cache.GetStream(ctx, pos.StreamId)
		if err != nil {
			return err
		}

		update, err := streamSub.Sub(ctx, pos, receiver)
		if err != nil {
			return err
		}
		subs = append(subs, streamSub)
		if update != nil {
			log.Debug("SyncLocalStreams: SENDING initial update", "streamId", update.StreamId, "cookie", update.NextSyncCookie)

			err = sendUpdate(update)
			if err != nil {
				return err
			}
		} else {
			log.Debug("SyncLocalStreams: NO initial update", "streamId", pos.StreamId)
		}
	}

	for {
		select {
		case update := <-receiver:
			if update != nil {
				if update.Events != nil && len(update.Events) > 0 {
					log.Debug("SyncLocalStreams: SENDING received update", "streamId", update.StreamId, "cookie", update.NextSyncCookie)

					err := sendUpdate(update)
					if err != nil {
						return err
					}
				} else {
					log.Debug("SyncLocalStreams: SYNC FLUSHED", "streamId", update.StreamId)
					return nil // TODO: error code to initiate sync backoff?
				}
			} else {
				return RiverError(Err_INTERNAL, "SyncLocalStreams: channel unexpectedly closed")
			}
		case <-ctx.Done():
			log.Debug("SyncLocalStreams: context done", "syncPos", syncPos)
			return nil
		}
	}
}
