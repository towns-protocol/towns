package migrations

import (
	"encoding/hex"
	"testing"

	"github.com/stretchr/testify/require"

	"google.golang.org/protobuf/proto"

	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

func TestSnapshotMigration0005(t *testing.T) {
	t.Run("with common session IDs and empty solicitations", func(t *testing.T) {
		commonSessionIdBytes := []byte("common-session-id-5")
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
							{SessionIds: []string{commonSessionId}}, // Will become empty
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

		snapshot_migration_0005_(snap, true)

		for _, member := range snap.GetMembers().GetJoined() {
			for _, solicitation := range member.GetSolicitations() {
				require.NotContains(t, solicitation.GetSessionIds(), commonSessionId)
			}
			// All solicitations should be non-empty
			for _, solicitation := range member.GetSolicitations() {
				require.NotEmpty(t, solicitation.GetSessionIds())
			}
			// Usernames and display names with common session IDs should be cleared
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

	t.Run("with empty members", func(t *testing.T) {
		snap := &Snapshot{}
		snapshot_migration_0005_(snap, true)
		require.NotNil(t, snap)
	})

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
		snapshot_migration_0005_(snap, true)
		resultBytes, err := proto.Marshal(snap)
		require.NoError(t, err)
		require.Equal(t, snapCopy, resultBytes)
	})
}
