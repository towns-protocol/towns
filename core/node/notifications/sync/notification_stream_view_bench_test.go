package sync

import (
	"context"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"google.golang.org/protobuf/proto"

	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

// BenchmarkNotificationStreamView_Creation measures memory allocation for creating stream views
func BenchmarkNotificationStreamView_Creation(b *testing.B) {
	ctx := context.Background()
	streamID := shared.StreamId{0x20}

	// Create snapshot with 100 members (typical channel size)
	members := make([]*MemberPayload_Snapshot_Member, 100)
	for i := 0; i < 100; i++ {
		addr := common.BigToAddress(common.Big1)
		addr[19] = byte(i)
		members[i] = &MemberPayload_Snapshot_Member{UserAddress: addr.Bytes()}
	}

	snapshot := &Snapshot{
		Content: &Snapshot_ChannelContent{
			ChannelContent: &ChannelPayload_Snapshot{},
		},
		Members: &MemberPayload_Snapshot{
			Joined: members,
		},
	}

	snapshotBytes, _ := proto.Marshal(snapshot)

	prefs := newMockUserPreferences()
	listener := newMockListener()

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		stream := &StreamAndCookie{
			Snapshot: &Envelope{Event: snapshotBytes},
		}

		_, err := NewNotificationStreamView(ctx, streamID, nil, stream, listener, prefs)
		if err != nil {
			b.Fatal(err)
		}
	}
}

// BenchmarkNotificationStreamView_MembershipUpdates measures memory allocation for processing events
func BenchmarkNotificationStreamView_MembershipUpdates(b *testing.B) {
	ctx := context.Background()
	streamID := shared.StreamId{0x20}

	snapshot := &Snapshot{
		Content: &Snapshot_ChannelContent{
			ChannelContent: &ChannelPayload_Snapshot{},
		},
		Members: &MemberPayload_Snapshot{},
	}

	snapshotBytes, _ := proto.Marshal(snapshot)

	stream := &StreamAndCookie{
		Snapshot: &Envelope{Event: snapshotBytes},
	}

	prefs := newMockUserPreferences()
	listener := newMockListener()

	view, _ := NewNotificationStreamView(ctx, streamID, nil, stream, listener, prefs)

	// Create join event
	member := common.HexToAddress("0x1111111111111111111111111111111111111111")
	joinEvent := &StreamEvent{
		Payload: &StreamEvent_MemberPayload{
			MemberPayload: &MemberPayload{
				Content: &MemberPayload_Membership_{
					Membership: &MemberPayload_Membership{
						Op:          MembershipOp_SO_JOIN,
						UserAddress: member.Bytes(),
					},
				},
			},
		},
	}

	joinEventBytes, _ := proto.Marshal(joinEvent)
	envelope := &Envelope{Event: joinEventBytes}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		_ = view.ApplyEvent(ctx, envelope)
	}
}

// BenchmarkNotificationStreamView_GetChannelMembers measures performance of member retrieval
func BenchmarkNotificationStreamView_GetChannelMembers(b *testing.B) {
	ctx := context.Background()
	streamID := shared.StreamId{0x20}

	// Create snapshot with 1000 members (large channel)
	members := make([]*MemberPayload_Snapshot_Member, 1000)
	for i := 0; i < 1000; i++ {
		addr := common.BigToAddress(common.Big1)
		addr[18] = byte(i / 256)
		addr[19] = byte(i % 256)
		members[i] = &MemberPayload_Snapshot_Member{UserAddress: addr.Bytes()}
	}

	snapshot := &Snapshot{
		Content: &Snapshot_ChannelContent{
			ChannelContent: &ChannelPayload_Snapshot{},
		},
		Members: &MemberPayload_Snapshot{
			Joined: members,
		},
	}

	snapshotBytes, _ := proto.Marshal(snapshot)

	stream := &StreamAndCookie{
		Snapshot: &Envelope{Event: snapshotBytes},
	}

	prefs := newMockUserPreferences()
	listener := newMockListener()

	view, _ := NewNotificationStreamView(ctx, streamID, nil, stream, listener, prefs)

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		_, err := view.GetChannelMembers()
		if err != nil {
			b.Fatal(err)
		}
	}
}

// BenchmarkNotificationStreamView_MemoryFootprint measures total memory for 1000 streams
func BenchmarkNotificationStreamView_MemoryFootprint(b *testing.B) {
	ctx := context.Background()

	// Create 100-member snapshot template
	members := make([]*MemberPayload_Snapshot_Member, 100)
	for i := 0; i < 100; i++ {
		addr := common.BigToAddress(common.Big1)
		addr[19] = byte(i)
		members[i] = &MemberPayload_Snapshot_Member{UserAddress: addr.Bytes()}
	}

	snapshot := &Snapshot{
		Content: &Snapshot_ChannelContent{
			ChannelContent: &ChannelPayload_Snapshot{},
		},
		Members: &MemberPayload_Snapshot{
			Joined: members,
		},
	}

	snapshotBytes, _ := proto.Marshal(snapshot)

	prefs := newMockUserPreferences()
	listener := newMockListener()

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		views := make([]*NotificationStreamView, 1000)

		for j := 0; j < 1000; j++ {
			streamID := shared.StreamId{0x20}
			streamID[1] = byte(j / 256)
			streamID[2] = byte(j % 256)

			stream := &StreamAndCookie{
				Snapshot: &Envelope{Event: snapshotBytes},
			}

			view, err := NewNotificationStreamView(ctx, streamID, nil, stream, listener, prefs)
			if err != nil {
				b.Fatal(err)
			}
			views[j] = view
		}

		// Keep views alive to measure retained memory
		_ = views
	}
}
