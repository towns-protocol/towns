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

	_ = r.forEachEvent(0, func(e *ParsedEvent) (bool, error) {
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

	exists := users.Contains(userId)
	return exists, nil
}
