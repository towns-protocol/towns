package events

import (
	"bytes"
	. "casablanca/node/base"
	. "casablanca/node/protocol"
)

func SyncCookieEqual(a, b *SyncCookie) bool {
	if a == nil || b == nil {
		return a == b
	}
	return a.StreamId == b.StreamId &&
		a.MiniblockNum == b.MiniblockNum &&
		bytes.Equal(a.MiniblockHash, b.MiniblockHash) &&
		a.MinipoolInstance == b.MinipoolInstance &&
		a.MinipoolSlot == b.MinipoolSlot
}

func SyncCookieCopy(a *SyncCookie) *SyncCookie {
	if a == nil {
		return nil
	}
	return &SyncCookie{
		StreamId:         a.StreamId,
		MiniblockNum:     a.MiniblockNum,
		MiniblockHash:    a.MiniblockHash,
		MinipoolInstance: a.MinipoolInstance,
		MinipoolSlot:     a.MinipoolSlot,
	}
}

func SyncCookieValidate(cookie *SyncCookie) error {
	if cookie == nil ||
		cookie.StreamId == "" ||
		cookie.MiniblockNum < 0 ||
		cookie.MiniblockHash == nil ||
		len(cookie.MiniblockHash) <= 0 ||
		cookie.MinipoolInstance == "" ||
		cookie.MinipoolSlot < 0 {
		return RiverError(Err_BAD_SYNC_COOKIE, "Bad SyncCookie", "cookie=", cookie)
	}
	return nil
}
