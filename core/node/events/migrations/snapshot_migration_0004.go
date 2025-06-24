package migrations

import (
	"encoding/hex"
	"slices"

	. "github.com/towns-protocol/towns/core/node/protocol"
)

/**
 * One time fix migration to remove lost sessionIds from key solicitations
 * Loop over all Member objects, count sessionIds across solicitations
 * and log those appearing in get 25% of members, checking if they map to
 * username or display_name encrypted payloads
 */
func snapshot_migration_0004(iSnapshot *Snapshot) {
	snapshot_migration_0004_(iSnapshot, false)
}

func snapshot_migration_0004_(iSnapshot *Snapshot, force bool) {
	if iSnapshot.Members == nil || (len(iSnapshot.Members.Joined) < 500 && !force) {
		return
	}

	members := iSnapshot.Members.Joined
	sessionIdCounts := make(map[string]int)
	memberCount := len(members)
	threshold := max(memberCount/4, 2) // 25% threshold, minimum 2 for testing

	for _, member := range members {
		processedIds := make(map[string]bool) // Track IDs processed for this member

		if len(member.Solicitations) == 0 {
			continue
		}

		for _, solicitation := range member.Solicitations {
			if len(solicitation.SessionIds) == 0 {
				continue
			}

			for _, sessionId := range solicitation.SessionIds {
				if !processedIds[sessionId] {
					processedIds[sessionId] = true
					sessionIdCounts[sessionId]++
				}
			}
		}
	}

	var lostSessionIds []string
	for sessionId, count := range sessionIdCounts {
		if count > threshold {
			lostSessionIds = append(lostSessionIds, sessionId)
		}
	}
	slices.Sort(lostSessionIds)

	if len(lostSessionIds) > 0 {
		lostSessionIdsSet := make(map[string]bool)
		for _, id := range lostSessionIds {
			lostSessionIdsSet[id] = true
		}

		numRemove := 0
		usernamesCleared := 0
		displayNamesCleared := 0

		for _, member := range members {
			// Remove common session IDs from solicitations
			for _, solicitation := range member.Solicitations {
				before := len(solicitation.SessionIds)
				var newSessionIds []string
				for _, sessionId := range solicitation.SessionIds {
					if !lostSessionIdsSet[sessionId] {
						newSessionIds = append(newSessionIds, sessionId)
					}
				}
				solicitation.SessionIds = newSessionIds
				numRemove += before - len(newSessionIds)
			}

			// Clear lost usernames and display names
			if member.Username != nil && member.Username.Data != nil {
				if (member.Username.Data.SessionId != "" && lostSessionIdsSet[member.Username.Data.SessionId]) ||
					(len(member.Username.Data.SessionIdBytes) > 0 &&
						lostSessionIdsSet[hex.EncodeToString(member.Username.Data.SessionIdBytes)]) {
					member.Username = nil
					usernamesCleared++
				}
			}

			if member.DisplayName != nil && member.DisplayName.Data != nil {
				if (member.DisplayName.Data.SessionId != "" && lostSessionIdsSet[member.DisplayName.Data.SessionId]) ||
					(len(member.DisplayName.Data.SessionIdBytes) > 0 &&
						lostSessionIdsSet[hex.EncodeToString(member.DisplayName.Data.SessionIdBytes)]) {
					member.DisplayName = nil
					displayNamesCleared++
				}
			}
		}
	}
}
