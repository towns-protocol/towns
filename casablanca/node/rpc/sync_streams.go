package rpc

import (
	"casablanca/node/infra"
	. "casablanca/node/protocol"
	"context"

	. "casablanca/node/base"
	. "casablanca/node/events"

	connect_go "github.com/bufbuild/connect-go"
	"github.com/sirupsen/logrus"
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
	ctx, log, requestId := infra.SetLoggerWithRequestId(ctx)

	for _, pos := range req.Msg.SyncPos {
		log.Infof("SyncStreams: pos %v", pos)
	}
	log.Infof("SyncStreams: buf=%v", req.Msg)

	err := s.syncStreams(ctx, req, stream, log)

	if err != nil {
		log.Errorf("SyncStreams ERROR: %v", err)
		syncStreamsRequests.Fail()
		return RpcAddRequestId(err, requestId)
	}

	log.Info("SyncStreams: LEAVE")
	syncStreamsRequests.Pass()
	return err
}

func (s *Service) syncStreams(ctx context.Context, req *connect_go.Request[SyncStreamsRequest], stream *connect_go.ServerStream[SyncStreamsResponse], log *logrus.Entry) error {
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
			log.Infof("SyncStreams: SENDING initial update streamId=%s cookie=%v", update.StreamId, update.NextSyncCookie)

			updates := []*StreamAndCookie{update}
			addUpdatesToCounter(updates)
			err = stream.Send(&SyncStreamsResponse{
				Streams: updates,
			})

			if err != nil {
				return err
			}
		} else {
			log.Infof("SyncStreams: NO initial update streamId=%s", pos.StreamId)
		}
	}

	for {
		select {
		case update := <-receiver:
			if update != nil {
				log.Infof("SyncStreams: SENDING received update streamId=%s cookie=%v", update.StreamId, update.NextSyncCookie)

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
			log.Infof("SyncStreams: context done for %v", req.Msg.SyncPos)
			return nil
		}
	}
}
