/*
Stream types for interacting with the blockchain layer.
*/
package common

type StreamType int64

const InvalidStreamType StreamType = -1

const (
	Space StreamType = iota
	Channel
	DMChannel
	User
	UserSettings
	Unknown
)

func (r StreamType) String() string {
	switch r {
	case Space:
		return "space"
	case Channel:
		return "channel"
	case DMChannel:
		return "dm_channel"
	case User:
		return "user"
	case UserSettings:
		return "user_settings"
	case Unknown:
		return "unknown"
	case InvalidStreamType:
		return "invalid"
	default:
		return "unknown"
	}
}

type StreamInfo struct {
	SpaceId    string
	ChannelId  string
	StreamType StreamType
}

type MediaStreamInfo struct {
	StreamInfo
	MediaId    string
	ChunkCount int32
}

type DMStreamInfo struct {
	FirstPartyId  string
	SecondPartyId string
}
