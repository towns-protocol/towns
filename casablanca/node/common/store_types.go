/*
Stream types
*/
package common

const (
	ConstSpaceChildEventType  = "m.space.child"
	ConstSpaceParentEventType = "m.space.parent"
)

// Define enum for RoomType
type RoomType int64

const (
	Space RoomType = iota
	Channel
	User
	UserSettings
	Unknown
)

func (r RoomType) String() string {
	switch r {
	case Space:
		return "space"
	case Channel:
		return "channel"
	case User:
		return "user"
	}
	return "unknown"
}

type RoomInfo struct {
	SpaceNetworkId   string
	ChannelNetworkId string
	RoomType         RoomType
	IsOwner          bool
}
