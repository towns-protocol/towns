package events

import (
	mapset "github.com/deckarep/golang-set/v2"
	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

type UserSettingsStreamView interface {
	// BlockedUsers returns the set of user addresses that are blocked by the user settings stream owner.
	BlockedUsers() (mapset.Set[common.Address], error)
}

var _ UserSettingsStreamView = (*StreamView)(nil)

// BlockedUsers returns a set of addresses that are blocked.
// r must be a view over a user settings stream (shared.STREAM_USER_SETTINGS_BIN 0xa5)
func (r *StreamView) BlockedUsers() (mapset.Set[common.Address], error) {
	blocked := mapset.NewSet[common.Address]()

	if r.streamId.Type() != shared.STREAM_USER_SETTINGS_BIN {
		return blocked, base.RiverError(Err_INVALID_ARGUMENT, "Not a user settings stream").
			Func("BlockedUsers")
	}

	// apply user block/unblock events from snapshot
	for _, blocks := range r.snapshot.GetUserSettingsContent().GetUserBlocksList() {
		addr := common.BytesToAddress(blocks.GetUserId())
		for _, block := range blocks.GetBlocks() {
			if block.GetIsBlocked() {
				blocked.Add(addr)
			} else {
				blocked.Remove(addr)
			}
		}
	}

	// apply block/unblock updates after snapshot was taken
	updateFn := func(e *ParsedEvent, minibockNum int64, eventNum int64) (bool, error) {
		if payload, ok := e.Event.Payload.(*StreamEvent_UserSettingsPayload); ok {
			var (
				addr      = common.BytesToAddress(payload.UserSettingsPayload.GetUserBlock().GetUserId())
				isBlocked = payload.UserSettingsPayload.GetUserBlock().GetIsBlocked()
			)

			if isBlocked {
				blocked.Add(addr)
			} else {
				blocked.Remove(addr)
			}
		}
		return true, nil
	}

	err := r.forEachEvent(r.snapshotIndex+1, updateFn)
	if err != nil {
		return nil, err
	}

	return blocked, nil
}
