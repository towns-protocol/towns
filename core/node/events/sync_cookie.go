package events

import (
	"bytes"

	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/protocol"
)

func SyncCookieEqual(a, b *SyncCookie) bool {
	if a == nil || b == nil {
		return a == b
	}
	return bytes.Equal(a.NodeAddress[:], b.NodeAddress[:]) &&
		bytes.Equal(a.StreamId, b.StreamId) &&
		a.MinipoolGen == b.MinipoolGen &&
		a.MinipoolSlot == b.MinipoolSlot &&
		bytes.Equal(a.PrevMiniblockHash, b.PrevMiniblockHash)
}

func SyncCookieCopy(a *SyncCookie) *SyncCookie {
	if a == nil {
		return nil
	}
	return &SyncCookie{
		NodeAddress:       a.NodeAddress,
		StreamId:          a.StreamId,
		MinipoolGen:       a.MinipoolGen,
		MinipoolSlot:      a.MinipoolSlot,
		PrevMiniblockHash: a.PrevMiniblockHash,
	}
}

func SyncCookieValidate(cookie *SyncCookie) error {
	if cookie == nil ||
		len(cookie.NodeAddress) == 0 ||
		len(cookie.StreamId) == 0 ||
		cookie.MinipoolGen <= 0 ||
		cookie.MinipoolSlot < 0 ||
		cookie.PrevMiniblockHash == nil ||
		len(cookie.PrevMiniblockHash) <= 0 {
		return RiverError(Err_BAD_SYNC_COOKIE, "Bad SyncCookie", "cookie=", cookie)
	}
	return nil
}
