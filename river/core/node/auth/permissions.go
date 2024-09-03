package auth

type Permission int

const (
	PermissionUndefined Permission = iota // No permission required
	PermissionRead
	PermissionWrite
	PermissionInvite
	PermissionJoin
	PermissionRedact
	PermissionBan
	PermissionPinMessage
	PermissionAddRemoveChannels
	PermissionModifySpaceSettings
	PermissionReact
)

func (p Permission) String() string {
	switch p {
	case PermissionUndefined:
		return "Undefined"
	case PermissionRead:
		return "Read"
	case PermissionWrite:
		return "Write"
	case PermissionInvite:
		return "Invite"
	case PermissionJoin:
		return "Join"
	case PermissionRedact:
		return "Redact"
	case PermissionBan:
		return "Ban"
	case PermissionPinMessage:
		return "PinMessage"
	case PermissionAddRemoveChannels:
		return "AddRemoveChannels"
	case PermissionModifySpaceSettings:
		return "ModifySpaceSettings"
	case PermissionReact:
		return "React"

	default:
		return "Unknown"
	}
}
