package migrations

import (
	"encoding/hex"
	"testing"

	"github.com/stretchr/testify/require"

	"google.golang.org/protobuf/proto"

	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

func TestSnapshotMigration0004(t *testing.T) {
	// Test case 1: Run migration with common session IDs
	t.Run("with common session IDs", func(t *testing.T) {
		commonSessionIdBytes := []byte("common-session-id")
		commonSessionId := hex.EncodeToString(commonSessionIdBytes)
		spaceId, err := shared.MakeSpaceId()
		require.NoError(t, err)

		snap := &Snapshot{
			Content: &Snapshot_SpaceContent{
				SpaceContent: &SpacePayload_Snapshot{
					Inception: &SpacePayload_Inception{
						StreamId: spaceId[:],
					},
				},
			},
			Members: &MemberPayload_Snapshot{
				Joined: []*MemberPayload_Snapshot_Member{
					{
						Solicitations: []*MemberPayload_KeySolicitation{
							{SessionIds: []string{commonSessionId, "unique1_a"}},
							{SessionIds: []string{commonSessionId, "unique1_b"}},
						},
						Username: &WrappedEncryptedData{
							Data: &EncryptedData{
								SessionId: commonSessionId,
								Algorithm: "test-algo",
							},
						},
						DisplayName: &WrappedEncryptedData{
							Data: &EncryptedData{
								SessionIdBytes: commonSessionIdBytes,
								Algorithm:      "test-algo",
							},
						},
					},
					{
						Solicitations: []*MemberPayload_KeySolicitation{
							{SessionIds: []string{commonSessionId, "unique2"}},
						},
						Username: &WrappedEncryptedData{
							Data: &EncryptedData{
								SessionIdBytes: commonSessionIdBytes,
								Algorithm:      "test-algo",
							},
						},
					},
					{
						Solicitations: []*MemberPayload_KeySolicitation{
							{SessionIds: []string{commonSessionId, "unique3"}},
						},
					},
					{
						Solicitations: []*MemberPayload_KeySolicitation{
							{SessionIds: []string{"unique4"}},
						},
					},
				},
			},
		}

		snapshot_migration_0004_(snap, true)

		// Verify that common session IDs are removed
		for _, member := range snap.GetMembers().GetJoined() {
			for _, solicitation := range member.GetSolicitations() {
				require.NotContains(t, solicitation.GetSessionIds(), commonSessionId)
			}

			// Verify that usernames and display names with common session IDs are cleared
			if member.GetUsername() != nil {
				require.NotEqual(t, member.GetUsername().GetData().GetSessionId(), commonSessionId)
				if len(member.GetUsername().GetData().GetSessionIdBytes()) > 0 {
					require.NotEqual(t, string(member.GetUsername().GetData().GetSessionIdBytes()), commonSessionId)
				}
			}

			if member.GetDisplayName() != nil {
				require.NotEqual(t, member.GetDisplayName().GetData().GetSessionId(), commonSessionId)
				if len(member.GetDisplayName().GetData().GetSessionIdBytes()) > 0 {
					require.NotEqual(t, string(member.GetDisplayName().GetData().GetSessionIdBytes()), commonSessionId)
				}
			}
		}
	})

	// Test case 2: Run migration with empty members
	t.Run("with empty members", func(t *testing.T) {
		snap := &Snapshot{}
		snapshot_migration_0004_(snap, true)
		// The snapshot should remain the same reference
		require.NotNil(t, snap)
	})

	// Test case 3: Run migration with no common session IDs
	t.Run("with no common session IDs", func(t *testing.T) {
		snap := &Snapshot{
			Members: &MemberPayload_Snapshot{
				Joined: []*MemberPayload_Snapshot_Member{
					{
						UserAddress: []byte("member1"),
						Solicitations: []*MemberPayload_KeySolicitation{
							{SessionIds: []string{"unique1", "unique2"}},
						},
						Username: &WrappedEncryptedData{
							Data: &EncryptedData{
								SessionId: "unique3",
								Algorithm: "test-algo",
							},
						},
					},
					{
						UserAddress: []byte("member2"),
						Solicitations: []*MemberPayload_KeySolicitation{
							{SessionIds: []string{"unique4", "unique5"}},
						},
					},
				},
			},
		}

		snapCopy, err := proto.Marshal(snap)
		require.NoError(t, err)
		snapshot_migration_0004_(snap, true)
		// Verify the snapshot remains unchanged when no common session IDs are found
		resultBytes, err := proto.Marshal(snap)
		require.NoError(t, err)
		require.Equal(t, snapCopy, resultBytes)
	})
}
