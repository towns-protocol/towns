package events

import (
	"bytes"

	"github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/shared"

	mapset "github.com/deckarep/golang-set/v2"
)

type JoinableStreamView interface {
	StreamView
	GetChannelMembers() (*mapset.Set[string], error)
	GetMembership(userAddress []byte) (protocol.MembershipOp, error)
}

var _ JoinableStreamView = (*streamViewImpl)(nil)

func (r *streamViewImpl) GetChannelMembers() (*mapset.Set[string], error) {
	members := mapset.NewSet[string]()

	for _, member := range r.snapshot.Members.Joined {
		userId, err := shared.AddressHex(member.UserAddress)
		if err != nil {
			return nil, err
		}
		members.Add(userId)
	}

	updateFn := func(e *ParsedEvent) (bool, error) {
		switch payload := e.Event.Payload.(type) {
		case *protocol.StreamEvent_MemberPayload:
			switch payload := payload.MemberPayload.Content.(type) {
			case *protocol.MemberPayload_Membership_:
				user, err := shared.AddressHex(payload.Membership.UserAddress)
				if err != nil {
					return false, err
				}
				if payload.Membership.GetOp() == protocol.MembershipOp_SO_JOIN {
					members.Add(user)
				} else if payload.Membership.GetOp() == protocol.MembershipOp_SO_LEAVE {
					members.Remove(user)
				}
			default:
				break
			}
		}
		return true, nil
	}

	err := r.forEachEvent(r.snapshotIndex+1, updateFn)
	if err != nil {
		return nil, err
	}

	return &members, nil
}

func (r *streamViewImpl) GetMembership(userAddress []byte) (protocol.MembershipOp, error) {
	retValue := protocol.MembershipOp_SO_UNSPECIFIED

	member, _ := findMember(r.snapshot.Members.Joined, userAddress)
	if member != nil {
		retValue = protocol.MembershipOp_SO_JOIN
	}

	updateFn := func(e *ParsedEvent) (bool, error) {
		switch payload := e.Event.Payload.(type) {
		case *protocol.StreamEvent_MemberPayload:
			switch payload := payload.MemberPayload.Content.(type) {
			case *protocol.MemberPayload_Membership_:
				if bytes.Equal(payload.Membership.UserAddress, userAddress) {
					retValue = payload.Membership.Op
				}
			default:
				break
			}
		}
		return true, nil
	}

	err := r.forEachEvent(r.snapshotIndex+1, updateFn)
	if err != nil {
		return retValue, err
	}

	return retValue, nil
}
