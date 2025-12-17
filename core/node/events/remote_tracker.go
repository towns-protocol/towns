package events

import (
	"slices"

	"github.com/ethereum/go-ethereum/common"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

// remoteTracker is a simplified version of StreamNodes that tracks the current remote and the list of remotes.
// It is intededed for single tasks that need retries, such as streamReconciler.
// AdvanceStickyPeer logic in StreamNodes is intended for concurrent tracking, and may not retry on all available replicas.
// Also, in case of downloading miniblocks, remote error does not indicate persistent problem since this particular range
// of miniblocks may not be available on this remote.
// remoteTracker is not thread-safe.
type remoteTracker struct {
	currentRemote int
	remotes       []common.Address
}

func newRemoteTracker(currentRemote common.Address, remotes []common.Address) remoteTracker {
	index := slices.Index(remotes, currentRemote)
	if index == -1 {
		index = 0
	}
	return remoteTracker{
		currentRemote: index,
		remotes:       remotes,
	}
}

// execute runs the given function on all remotes in round-robin manner starting from the current remote.
// On first success nil is returned.
// On failure, Err_UNAVAILABLE error is returned with all errors as bases.
func (rt remoteTracker) execute(f func(common.Address) error) error {
	var errs []error
	for range rt.remotes {
		err := f(rt.remotes[rt.currentRemote])
		if err == nil {
			return nil
		}
		errs = append(errs, err)

		rt.currentRemote++
		if rt.currentRemote >= len(rt.remotes) {
			rt.currentRemote = 0
		}
	}

	if len(errs) == 0 {
		return RiverError(Err_UNAVAILABLE, "No peers")
	}

	return RiverErrorWithBases(Err_UNAVAILABLE, "Retry on all peers failed", errs)
}
