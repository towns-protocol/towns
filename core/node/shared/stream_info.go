package shared

type MediaStreamInfo struct {
	ChannelId  string
	MediaId    string
	ChunkCount int32
}

type DMStreamInfo struct {
	FirstPartyId  string
	SecondPartyId string
}
