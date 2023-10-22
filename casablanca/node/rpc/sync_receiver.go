package rpc

import (
	. "casablanca/node/base"
	"casablanca/node/dlog"
	. "casablanca/node/events"
	. "casablanca/node/protocol"
	"context"
	"sync"
)

type syncReceiver struct {
	ctx     context.Context
	cancel  context.CancelFunc
	channel chan *SyncStreamsResponse

	mu         sync.Mutex
	firstError error
}

var _ SyncResultReceiver = (*syncReceiver)(nil)

func (s *syncReceiver) OnUpdate(r *SyncStreamsResponse) {
	if s.ctx.Err() != nil {
		return
	}

	select {
	case s.channel <- r:
		return
	default:
		err :=
			RiverError(Err_BUFFER_FULL, "channel full, dropping update and canceling", "streamId", r.Streams[0].NextSyncCookie.StreamId).
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

func (s *syncReceiver) getError() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.firstError
}

type syncSender interface {
	Send(msg *SyncStreamsResponse) error
}

func (s *syncReceiver) dispatch(sender syncSender) {
	log := dlog.CtxLog(s.ctx)

	for {
		select {
		case <-s.ctx.Done():
			err := s.ctx.Err()
			s.setErrorAndCancel(err)
			log.Debug("SyncStreams: context done", "err", err)
			return
		case resp := <-s.channel:
			log.Debug("SyncStreams: received update in forward loop", "resp", resp)
			if err := sender.Send(resp); err != nil {
				s.setErrorAndCancel(err)
				log.Debug("SyncStreams: failed to send update", "resp", resp, "err", err)
				return
			}
		}
	}

}
