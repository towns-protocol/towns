package events

import (
	"github.com/river-build/river/protocol"

	mapset "github.com/deckarep/golang-set/v2"
)

type JoinableStreamView interface {
	StreamView
	IsUserJoined(userId string) (bool, error)
	IsUserInvited(userId string) (bool, error)
	GetChannelMembers() (*mapset.Set[string], error)
}

func (r *streamViewImpl) IsUserJoined(userId string) (bool, error) {
	members, err := r.getMembers()
	if err != nil {
		return false, err
	}
	exists := (*members).Contains(userId)
	return exists, nil
}

func (r *streamViewImpl) IsUserInvited(userId string) (bool, error) {
	invites, err := r.getInvites()
	if err != nil {
		return false, err
	}
	exists := (*invites).Contains(userId)
	return exists, nil
}

func (r *streamViewImpl) GetChannelMembers() (*mapset.Set[string], error) {
	return r.getMembers()
}

func (r *streamViewImpl) getMembers() (*mapset.Set[string], error) {
	members := mapset.NewSet[string]()

	switch snapshotContent := r.snapshot.Content.(type) {
	case *protocol.Snapshot_SpaceContent:
		for _, user := range snapshotContent.SpaceContent.GetMemberships() {
			if user.GetOp() == protocol.MembershipOp_SO_JOIN {
				members.Add(user.UserId)
			}
		}
	case *protocol.Snapshot_ChannelContent:
		for _, user := range snapshotContent.ChannelContent.GetMemberships() {
			if user.GetOp() == protocol.MembershipOp_SO_JOIN {
				members.Add(user.UserId)
			}
		}

	case *protocol.Snapshot_GdmChannelContent:
		for _, user := range snapshotContent.GdmChannelContent.GetMemberships() {
			if user.GetOp() == protocol.MembershipOp_SO_JOIN {
				members.Add(user.UserId)
			}
		}

	case *protocol.Snapshot_DmChannelContent:
		for _, user := range snapshotContent.DmChannelContent.GetMemberships() {
			if user.GetOp() == protocol.MembershipOp_SO_JOIN {
				members.Add(user.UserId)
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
				user := spacePayload.Membership.UserId
				if spacePayload.Membership.GetOp() == protocol.MembershipOp_SO_JOIN {
					members.Add(user)
				} else if spacePayload.Membership.GetOp() == protocol.MembershipOp_SO_LEAVE {
					members.Remove(user)
				}
			default:
				break
			}
		case *protocol.StreamEvent_ChannelPayload:
			switch channelPayload := payload.ChannelPayload.Content.(type) {
			case *protocol.ChannelPayload_Membership:
				user := channelPayload.Membership.UserId
				if channelPayload.Membership.GetOp() == protocol.MembershipOp_SO_JOIN {
					members.Add(user)
				} else if channelPayload.Membership.GetOp() == protocol.MembershipOp_SO_LEAVE {
					members.Remove(user)
				}
			default:
				break
			}

		case *protocol.StreamEvent_GdmChannelPayload:
			switch gdmChannelPayload := payload.GdmChannelPayload.Content.(type) {
			case *protocol.GdmChannelPayload_Membership:
				user := gdmChannelPayload.Membership.UserId
				if gdmChannelPayload.Membership.GetOp() == protocol.MembershipOp_SO_JOIN {
					members.Add(user)
				} else if gdmChannelPayload.Membership.GetOp() == protocol.MembershipOp_SO_LEAVE {
					members.Remove(user)
				}

			default:
				break
			}

		case *protocol.StreamEvent_DmChannelPayload:
			switch dmChannelPayload := payload.DmChannelPayload.Content.(type) {
			case *protocol.DmChannelPayload_Membership:
				user := dmChannelPayload.Membership.UserId
				if dmChannelPayload.Membership.GetOp() == protocol.MembershipOp_SO_JOIN {
					members.Add(user)
				} else if dmChannelPayload.Membership.GetOp() == protocol.MembershipOp_SO_LEAVE {
					members.Remove(user)
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

func (r *streamViewImpl) getInvites() (*mapset.Set[string], error) {
	invites := mapset.NewSet[string]()
	switch snapshotContent := r.snapshot.Content.(type) {
	case *protocol.Snapshot_GdmChannelContent:
		for _, user := range snapshotContent.GdmChannelContent.GetMemberships() {
			if user.GetOp() == protocol.MembershipOp_SO_INVITE {
				invites.Add(user.UserId)
			}
		}
	case *protocol.Snapshot_DmChannelContent:
		for _, user := range snapshotContent.DmChannelContent.GetMemberships() {
			if user.GetOp() == protocol.MembershipOp_SO_INVITE {
				invites.Add(user.UserId)
			}
		}

	default:
		break
	}

	err := r.forEachEvent(r.snapshotIndex+1, func(e *ParsedEvent) (bool, error) {
		switch payload := e.Event.Payload.(type) {
		case *protocol.StreamEvent_GdmChannelPayload:
			switch gdmChannelPayload := payload.GdmChannelPayload.Content.(type) {
			case *protocol.GdmChannelPayload_Membership:
				user := gdmChannelPayload.Membership.UserId
				// If a user leaves, they will need to be re-invited to the channel.
				if gdmChannelPayload.Membership.GetOp() == protocol.MembershipOp_SO_INVITE {
					invites.Add(user)
				} else if gdmChannelPayload.Membership.GetOp() == protocol.MembershipOp_SO_LEAVE {
					invites.Remove(user)
				}
			default:
				break
			}

		case *protocol.StreamEvent_DmChannelPayload:
			switch payload := payload.DmChannelPayload.Content.(type) {
			case *protocol.DmChannelPayload_Membership:
				user := payload.Membership.UserId
				// If a user leaves, they will need to be re-invited to the channel.
				if payload.Membership.GetOp() == protocol.MembershipOp_SO_INVITE {
					invites.Add(user)
				} else if payload.Membership.GetOp() == protocol.MembershipOp_SO_LEAVE {
					invites.Remove(user)
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

	return &invites, nil
}
