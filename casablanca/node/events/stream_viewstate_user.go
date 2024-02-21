package events

import (
	. "github.com/river-build/river/base"
	. "github.com/river-build/river/protocol"
)

type UserStreamView interface {
	GetUserInception() (*UserPayload_Inception, error)
	IsMemberOf(streamId string) bool
}

var _ UserStreamView = (*streamViewImpl)(nil)

func (r *streamViewImpl) GetUserInception() (*UserPayload_Inception, error) {
	i := r.InceptionPayload()
	c, ok := i.(*UserPayload_Inception)
	if ok {
		return c, nil
	} else {
		return nil, RiverError(Err_WRONG_STREAM_TYPE, "Expected user stream", "streamId", r.streamId)
	}
}

func (r *streamViewImpl) GetUserSnapshotContent() (*UserPayload_Snapshot, error) {
	s := r.snapshot.Content
	c, ok := s.(*Snapshot_UserContent)
	if ok {
		return c.UserContent, nil
	} else {
		return nil, RiverError(Err_WRONG_STREAM_TYPE, "Expected user stream", "streamId", r.streamId)
	}
}

func (r *streamViewImpl) IsMemberOf(streamId string) bool {
	if streamId == r.streamId {
		return true
	}

	snap, err := r.GetUserSnapshotContent()
	if err != nil {
		return false
	}
	membership := snap.Memberships[streamId]

	updateFn := func(e *ParsedEvent) (bool, error) {
		switch payload := e.Event.Payload.(type) {
		case *StreamEvent_UserPayload:
			switch payload := payload.UserPayload.Content.(type) {
			case *UserPayload_UserMembership_:
				if payload.UserMembership.StreamId == streamId {
					membership = payload.UserMembership
				}
			default:
				break
			}
		default:
			break
		}
		return true, nil // return forEachEvent
	}

	err = r.forEachEvent(r.snapshotIndex+1, updateFn)
	if err != nil {
		return false
	}

	if membership == nil {
		return false
	}

	return membership.Op == MembershipOp_SO_JOIN
}
