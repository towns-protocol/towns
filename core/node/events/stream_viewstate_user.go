package events

import (
	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/protocol"
)

type UserStreamView interface {
	GetUserInception() (*UserPayload_Inception, error)
	GetUserMembership(streamId string) (MembershipOp, error)
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
	userMembershipOp, err := r.GetUserMembership(streamId)
	if err != nil {
		return false
	}
	return userMembershipOp == MembershipOp_SO_JOIN
}

func (r *streamViewImpl) GetUserMembership(streamId string) (MembershipOp, error) {
	retValue := MembershipOp_SO_UNSPECIFIED

	snap, err := r.GetUserSnapshotContent()
	if err != nil {
		return retValue, err
	}
	if membership, ok := snap.Memberships[streamId]; ok {
		retValue = membership.Op
	}

	updateFn := func(e *ParsedEvent) (bool, error) {
		switch payload := e.Event.Payload.(type) {
		case *StreamEvent_UserPayload:
			switch payload := payload.UserPayload.Content.(type) {
			case *UserPayload_UserMembership_:
				if payload.UserMembership.StreamId == streamId {
					retValue = payload.UserMembership.Op
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
	return retValue, err
}
