package migrations

import (
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

func snapshot_migration_0002(iSnapshot *Snapshot) *Snapshot {
	switch snapshot := iSnapshot.Content.(type) {
	case *Snapshot_SpaceContent:
		for _, channel := range snapshot.SpaceContent.Channels {
			if channel.Settings == nil {
				channel.Settings = &SpacePayload_ChannelSettings{}
			}
			channelId, err := shared.StreamIdFromBytes(channel.ChannelId)
			if err != nil {
				// Note: it would be better to log this error, but we have no logging
				// context here at this time
				continue
			}
			if shared.IsDefaultChannelId(channelId) {
				channel.Settings.Autojoin = true
			}
		}
	}
	return iSnapshot
}
