package rpc

import (
	"context"
	"sync"

	. "github.com/river-build/river/base"
	"github.com/river-build/river/dlog"
	. "github.com/river-build/river/events"
	. "github.com/river-build/river/protocol"
)

type syncReceiver struct {
	ctx     context.Context
	cancel  context.CancelFunc
	channel chan *StreamAndCookie

	mu         sync.Mutex
	firstError error
}

var _ SyncResultReceiver = (*syncReceiver)(nil)

func (s *syncReceiver) OnUpdate(r *StreamAndCookie) {
	if s.ctx.Err() != nil {
		return
	}

	select {
	case s.channel <- r:
		return
	default:
		err :=
			RiverError(Err_BUFFER_FULL, "channel full, dropping update and canceling", "streamId", r.NextSyncCookie.StreamId).
				Func("OnUpdate").
				LogWarn(dlog.CtxLog(s.ctx))
		s.setErrorAndCancel(err)
		return
	}
}

func (s *syncReceiver) OnSyncError(err error) {
	if s.ctx.Err() != nil {
		return
	}
	s.setErrorAndCancel(err)
	dlog.CtxLog(s.ctx).Warn("OnSyncError: cancelling sync", "error", err)
}

func (s *syncReceiver) setErrorAndCancel(err error) {
	s.mu.Lock()
	if s.firstError == nil {
		s.firstError = err
	}
	s.mu.Unlock()

	s.cancel()
}

func (s *syncReceiver) Dispatch(sender syncStream) {
	log := dlog.CtxLog(s.ctx)

	for {
		select {
		case <-s.ctx.Done():
			err := s.ctx.Err()
			s.setErrorAndCancel(err)
			log.Debug("SyncStreams: context done", "err", err)
			return
		case data := <-s.channel:
			log.Debug("SyncStreams: received update in forward loop", "data", data)
			resp := SyncStreamsResponseFromStreamAndCookie(data)
			if err := sender.Send(resp); err != nil {
				s.setErrorAndCancel(err)
				log.Debug("SyncStreams: failed to send update", "resp", data, "err", err)
				return
			}
		}
	}
}
