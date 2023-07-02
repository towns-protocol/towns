package rpc

import (
	"casablanca/node/infra"
	. "casablanca/node/protocol"
	"context"

	. "casablanca/node/base"
	. "casablanca/node/events"

	connect_go "github.com/bufbuild/connect-go"
	"golang.org/x/exp/slog"
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

	log.Debug("SyncStreams ENTER", "request", req.Msg)

	err := s.syncStreams(ctx, log, req, stream)

	if err != nil {
		log.Warn("SyncStreams ERRO", "error", err)
		syncStreamsRequests.Fail()
		return err
	}

	log.Debug("SyncStreams LEAVE")
	syncStreamsRequests.Pass()
	return nil
}

func (s *Service) syncStreams(ctx context.Context, log *slog.Logger, req *connect_go.Request[SyncStreamsRequest], stream *connect_go.ServerStream[SyncStreamsResponse]) error {
	if len(req.Msg.SyncPos) <= 0 {
		return RpcError(Err_BAD_ARGS, "SyncStreams: SyncPos is empty")
	}

	receiver := make(chan *StreamAndCookie, 128) // TODO: setting
	subs := make([]*Stream, 0, len(req.Msg.SyncPos))
	defer func() {
		for _, sub := range subs {
			sub.Unsub(receiver)
		}
		close(receiver)
	}()

	for _, pos := range req.Msg.SyncPos {
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
			log.Debug("SyncStreams: SENDING initial update", "streamId", update.StreamId, "cookie", update.NextSyncCookie)

			updates := []*StreamAndCookie{update}
			addUpdatesToCounter(updates)
			err = stream.Send(&SyncStreamsResponse{
				Streams: updates,
			})

			if err != nil {
				return err
			}
		} else {
			log.Debug("SyncStreams: NO initial update", "streamId", pos.StreamId)
		}
	}

	for {
		select {
		case update := <-receiver:
			if update != nil {
				log.Debug("SyncStreams: SENDING received update", "streamId", update.StreamId, "cookie", update.NextSyncCookie)

				updates := []*StreamAndCookie{update}
				addUpdatesToCounter(updates)
				err := stream.Send(&SyncStreamsResponse{
					Streams: updates,
				})
				if err != nil {
					return err
				}
			} else {
				return RpcError(Err_INTERNAL_ERROR, "SyncStreams: channel unexpectedly closed")
			}
		case <-ctx.Done():
			log.Debug("SyncStreams: context done", "syncPos", req.Msg.SyncPos)
			return nil
		}
	}
}
