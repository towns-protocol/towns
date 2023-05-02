package auth

type Permission int64

const (
	// since iota starts with 0, the first value
	// defined here will be the default
	PermissionUndefined Permission = iota
	PermissionRead
	PermissionWrite
	PermissionPing
	PermissionInvite
	PermissionRedact
	PermissionBan
	PermissionModifyChannelProfile
	PermissionPinMessages
	PermissionAddRemoveChannels
	PermissionModifySpaceSettings
	PermissionOwner
)

func (p Permission) String() string {
	switch p {
	case PermissionUndefined:
		return "Undefined"
	case PermissionRead:
		return "Read"
	case PermissionWrite:
		return "Write"
	case PermissionPing:
		return "Ping"
	case PermissionInvite:
		return "Invite"
	case PermissionRedact:
		return "Redact"
	case PermissionBan:
		return "Ban"
	case PermissionModifyChannelProfile:
		return "ModifyChannelProfile"
	case PermissionPinMessages:
		return "PinMessages"
	case PermissionAddRemoveChannels:
		return "AddRemoveChannels"
	case PermissionModifySpaceSettings:
		return "ModifySpaceSettings"
	case PermissionOwner:
		return "Owner"
	}
	return "Unknown"
}
