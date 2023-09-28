package events

import (
	. "casablanca/node/protocol"

	mapset "github.com/deckarep/golang-set/v2"
)

type JoinableStreamView interface {
	StreamView
	IsUserJoined(userId string) (bool, error)
}

func (r *streamViewImpl) IsUserJoined(userId string) (bool, error) {
	users := mapset.NewSet[string]()

	switch snapshotContent := r.snapshot.Content.(type) {
	case *Snapshot_SpaceContent:
		for _, member := range snapshotContent.SpaceContent.GetMemberships() {
			if member.GetOp() == MembershipOp_SO_JOIN {
				users.Add(member.UserId)
			}
		}
	case *Snapshot_ChannelContent:
		for _, member := range snapshotContent.ChannelContent.GetMemberships() {
			if member.GetOp() == MembershipOp_SO_JOIN {
				users.Add(member.UserId)
			}
		}
	default:
		break
	}

	err := r.forEachEvent(r.snapshotIndex+1, func(e *ParsedEvent) (bool, error) {
		switch payload := e.Event.Payload.(type) {
		case *StreamEvent_SpacePayload:
			switch spacePayload := payload.SpacePayload.Content.(type) {
			case *SpacePayload_Membership:
				user := spacePayload.Membership.UserId
				if spacePayload.Membership.GetOp() == MembershipOp_SO_JOIN {
					users.Add(user)
				} else if spacePayload.Membership.GetOp() == MembershipOp_SO_LEAVE {
					users.Remove(user)
				}
			default:
				break
			}
		case *StreamEvent_ChannelPayload:
			switch channelPayload := payload.ChannelPayload.Content.(type) {
			case *ChannelPayload_Membership:
				user := channelPayload.Membership.UserId
				if channelPayload.Membership.GetOp() == MembershipOp_SO_JOIN {
					users.Add(user)
				} else if channelPayload.Membership.GetOp() == MembershipOp_SO_LEAVE {
					users.Remove(user)
				}
			default:
				break
			}
		}
		return true, nil
	})

	if err != nil {
		return false, err
	}

	exists := users.Contains(userId)
	return exists, nil
}
