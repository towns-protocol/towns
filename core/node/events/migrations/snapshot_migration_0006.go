package migrations

import (
	. "github.com/towns-protocol/towns/core/node/protocol"
)

// snapshot_migration_0006 copies the app address from user stream inception
// to the stream owner's AppAddress field. This enables bot/app identification
// in member snapshots for DM validation without additional blockchain lookups.
func snapshot_migration_0006(iSnapshot *Snapshot) {
	var appAddress []byte

	switch content := iSnapshot.Content.(type) {
	case *Snapshot_UserContent:
		if content.UserContent != nil && content.UserContent.Inception != nil {
			appAddress = content.UserContent.Inception.AppAddress
		}
	case *Snapshot_UserSettingsContent:
		if content.UserSettingsContent != nil && content.UserSettingsContent.Inception != nil {
			appAddress = content.UserSettingsContent.Inception.AppAddress
		}
	case *Snapshot_UserInboxContent:
		if content.UserInboxContent != nil && content.UserInboxContent.Inception != nil {
			appAddress = content.UserInboxContent.Inception.AppAddress
		}
	case *Snapshot_UserMetadataContent:
		if content.UserMetadataContent != nil && content.UserMetadataContent.Inception != nil {
			appAddress = content.UserMetadataContent.Inception.AppAddress
		}
	default:
		return
	}

	if len(appAddress) == 0 || iSnapshot.Members == nil || len(iSnapshot.Members.Joined) == 0 {
		return
	}

	iSnapshot.Members.Joined[0].AppAddress = appAddress
}
