package track_streams

import (
	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/protocol"
)

// getFirstMiniblockNumber extracts the miniblock number from the first miniblock in the slice.
// Returns an error if miniblocks is empty or if parsing fails.
func getFirstMiniblockNumber(miniblocks []*protocol.Miniblock) (int64, error) {
	if len(miniblocks) == 0 {
		return 0, base.RiverError(protocol.Err_INVALID_ARGUMENT, "no miniblocks in response")
	}
	mbInfo, err := events.NewMiniblockInfoFromProto(miniblocks[0], nil, events.NewParsedMiniblockInfoOpts())
	if err != nil {
		return 0, err
	}
	return mbInfo.Ref.Num, nil
}
