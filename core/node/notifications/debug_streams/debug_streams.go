package debug_streams

import (
	"github.com/towns-protocol/towns/core/node/shared"
)

var debugStreamIds = []string{
	"1037f792728f5dd4049dd25442e7ed3f1a38a827d10000000000000000000000",
	"10ccd22c91939d9d6f9bf9ce7f3ad23c8e87a111260000000000000000000000",
}

var debugStreamMap map[shared.StreamId]bool

func init() {
	debugStreamMap = make(map[shared.StreamId]bool, len(debugStreamIds))

	for _, streamIdStr := range debugStreamIds {
		streamId, err := shared.StreamIdFromString(streamIdStr)
		if err == nil {
			debugStreamMap[streamId] = true
		}
	}
}

// IsDebugStream checks if the given stream id is in the debug list. If a space stream
// is in the debug list and this stream is a stream in that space, it will also be
// considered a debug stream. We use this to enable conditional logging for network debugging,
// but only for the notifications service.
func IsDebugStream(streamId shared.StreamId) bool {
	if _, ok := debugStreamMap[streamId]; ok {
		return ok
	}

	_, ok := debugStreamMap[streamId.SpaceID()]
	return ok
}
