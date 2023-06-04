package rpc

import (
	"casablanca/node/infra"
	. "casablanca/node/protocol"
	"context"
	"time"

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

	log.Infof("SyncStreams: ENTER timeout_ms=%d, len=%d", req.Msg.TimeoutMs, len(req.Msg.SyncPos))
	for _, pos := range req.Msg.SyncPos {
		log.Infof("SyncStreams: pos %s %s", pos.StreamId, string(pos.SyncCookie))
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
	// TODO: set req.Msg.TimeoutMs + epsilon in context
	timeout := time.After(time.Duration(req.Msg.TimeoutMs) * time.Millisecond)
	//timeout := time.After(1000 * time.Millisecond)

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

	var initialUpdates []*StreamAndCookie
	for _, pos := range req.Msg.SyncPos {
		if len(pos.StreamId) <= 0 {
			return RpcError(Err_BAD_ARGS, "SyncStreams: StreamId is empty")
		}
		if len(pos.SyncCookie) <= 0 {
			return RpcError(Err_BAD_ARGS, "SyncStreams: SyncCookie is empty")
		}

		stream, err := s.cache.GetStream(ctx, pos.StreamId)
		if err != nil {
			return err
		}

		update, err := stream.Sub(string(pos.SyncCookie), receiver)
		if err != nil {
			return err
		}
		subs = append(subs, stream)

		if update != nil {
			initialUpdates = append(initialUpdates, update)
		}
	}

	if len(initialUpdates) > 0 {
		addUpdatesToCounter(initialUpdates)
		err := stream.Send(&SyncStreamsResponse{
			Streams: initialUpdates,
		})
		if err != nil {
			return err
		}
		// TODO: remove to enable streaming
		return nil
	}

	for {
		select {
		case update := <-receiver:
			if update != nil {
				log.Infof("SyncStreams: SENDING update streamId=%s cookie=%s", update.StreamId, string(update.NextSyncCookie))

				updates := []*StreamAndCookie{update}
				addUpdatesToCounter(updates)
				err := stream.Send(&SyncStreamsResponse{
					Streams: updates,
				})
				if err != nil {
					return err
				}
				// TODO: remove to enable streaming
				return nil
			} else {
				return RpcError(Err_INTERNAL_ERROR, "SyncStreams: channel unexpectedly closed")
			}
		case <-timeout:
			log.Info("SyncStreams: TIMEOUT")
			return nil
		}
	}
}
