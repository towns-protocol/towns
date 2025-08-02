package migrations

import (
	"encoding/hex"
	"slices"

	. "github.com/towns-protocol/towns/core/node/protocol"
)

/**
 * One time fix migration to remove lost sessionIds from key solicitations
 * Loop over all Member objects, count sessionIds across solicitations
 * and log those appearing in get 5% of members, checking if they map to
 * username or display_name encrypted payloads
 */
func snapshot_migration_0005(iSnapshot *Snapshot) {
	snapshot_migration_0005_(iSnapshot, false)
}

func snapshot_migration_0005_(iSnapshot *Snapshot, force bool) {
	if iSnapshot.Members == nil || (len(iSnapshot.Members.Joined) < 500 && !force) {
		return
	}

	members := iSnapshot.Members.Joined
	sessionIdCounts := make(map[string]int)
	memberCount := len(members)
	threshold := max(memberCount/20, 2) // 5% threshold, minimum 2 for testing
	lostSessionIdsSet := make(map[string]bool)

	for _, member := range members {
		if len(member.Solicitations) == 0 {
			continue
		}

		for _, solicitation := range member.Solicitations {
			if len(solicitation.SessionIds) == 0 {
				continue
			}

			for _, sessionId := range solicitation.SessionIds {
				sessionIdCounts[sessionId]++
				if sessionIdCounts[sessionId] > threshold {
					lostSessionIdsSet[sessionId] = true
				}
			}
		}
	}

	if len(lostSessionIdsSet) > 0 {
		for _, member := range members {
			// Remove common session IDs from solicitations
			for _, solicitation := range member.Solicitations {
				var newSessionIds []string
				for _, sessionId := range solicitation.SessionIds {
					if !lostSessionIdsSet[sessionId] {
						newSessionIds = append(newSessionIds, sessionId)
					}
				}
				solicitation.SessionIds = newSessionIds
			}

			// Remove empty solicitations
			member.Solicitations = slices.DeleteFunc(
				member.Solicitations,
				func(solicitation *MemberPayload_KeySolicitation) bool {
					return len(solicitation.SessionIds) == 0
				},
			)

			// Clear lost usernames and display names
			if member.Username != nil && member.Username.Data != nil {
				if (member.Username.Data.SessionId != "" && lostSessionIdsSet[member.Username.Data.SessionId]) ||
					(len(member.Username.Data.SessionIdBytes) > 0 &&
						lostSessionIdsSet[hex.EncodeToString(member.Username.Data.SessionIdBytes)]) {
					member.Username = nil
				}
			}

			if member.DisplayName != nil && member.DisplayName.Data != nil {
				if (member.DisplayName.Data.SessionId != "" && lostSessionIdsSet[member.DisplayName.Data.SessionId]) ||
					(len(member.DisplayName.Data.SessionIdBytes) > 0 &&
						lostSessionIdsSet[hex.EncodeToString(member.DisplayName.Data.SessionIdBytes)]) {
					member.DisplayName = nil
				}
			}
		}
	}
}
