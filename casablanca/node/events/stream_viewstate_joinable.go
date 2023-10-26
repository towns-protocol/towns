package events

import (
	"casablanca/node/common"
	"casablanca/node/protocol"

	mapset "github.com/deckarep/golang-set/v2"
	"golang.org/x/exp/slices"
)

type JoinableStreamView interface {
	StreamView
	IsUserJoined(userId string) (bool, error)
	GetChannelMembers() (*mapset.Set[string], error)
}

func (r *streamViewImpl) IsUserJoined(userId string) (bool, error) {
	members, err := r.getMembers([]common.StreamType{common.Space, common.Channel, common.DMChannel})
	if err != nil {
		return false, err
	}
	exists := (*members).Contains(userId)
	return exists, nil
}

func (r *streamViewImpl) GetChannelMembers() (*mapset.Set[string], error) {
	return r.getMembers([]common.StreamType{common.Channel})
}

func (r *streamViewImpl) getMembers(filterBy []common.StreamType) (*mapset.Set[string], error) {
	members := mapset.NewSet[string]()

	switch snapshotContent := r.snapshot.Content.(type) {
	case *protocol.Snapshot_SpaceContent:
		if slices.Contains(filterBy, common.Space) {
			for _, user := range snapshotContent.SpaceContent.GetMemberships() {
				if user.GetOp() == protocol.MembershipOp_SO_JOIN {
					members.Add(user.UserId)
				}
			}
		}
	case *protocol.Snapshot_ChannelContent:
		if slices.Contains(filterBy, common.Channel) {
			for _, user := range snapshotContent.ChannelContent.GetMemberships() {
				if user.GetOp() == protocol.MembershipOp_SO_JOIN {
					members.Add(user.UserId)
				}
			}
		}
	case *protocol.Snapshot_DmChannelContent:
		if slices.Contains(filterBy, common.DMChannel) {
			for _, user := range snapshotContent.DmChannelContent.GetMemberships() {
				if user.GetOp() == protocol.MembershipOp_SO_JOIN {
					members.Add(user.UserId)
				}
			}
		}
	default:
		break
	}

	err := r.forEachEvent(r.snapshotIndex+1, func(e *ParsedEvent) (bool, error) {
		switch payload := e.Event.Payload.(type) {
		case *protocol.StreamEvent_SpacePayload:
			switch spacePayload := payload.SpacePayload.Content.(type) {
			case *protocol.SpacePayload_Membership:
				if slices.Contains(filterBy, common.Space) {
					user := spacePayload.Membership.UserId
					if spacePayload.Membership.GetOp() == protocol.MembershipOp_SO_JOIN {
						members.Add(user)
					} else if spacePayload.Membership.GetOp() == protocol.MembershipOp_SO_LEAVE {
						members.Remove(user)
					}
				}
			default:
				break
			}
		case *protocol.StreamEvent_ChannelPayload:
			switch channelPayload := payload.ChannelPayload.Content.(type) {
			case *protocol.ChannelPayload_Membership:
				if slices.Contains(filterBy, common.Channel) {
					user := channelPayload.Membership.UserId
					if channelPayload.Membership.GetOp() == protocol.MembershipOp_SO_JOIN {
						members.Add(user)
					} else if channelPayload.Membership.GetOp() == protocol.MembershipOp_SO_LEAVE {
						members.Remove(user)
					}
				}
			default:
				break
			}
		case *protocol.StreamEvent_DmChannelPayload:
			switch dmChannelPayload := payload.DmChannelPayload.Content.(type) {
			case *protocol.DmChannelPayload_Membership:
				if slices.Contains(filterBy, common.DMChannel) {
					user := dmChannelPayload.Membership.UserId
					if dmChannelPayload.Membership.GetOp() == protocol.MembershipOp_SO_JOIN {
						members.Add(user)
					} else if dmChannelPayload.Membership.GetOp() == protocol.MembershipOp_SO_LEAVE {
						members.Remove(user)
					}
				}
			default:
				break
			}
		}
		return true, nil
	})

	if err != nil {
		return nil, err
	}

	return &members, nil
}
