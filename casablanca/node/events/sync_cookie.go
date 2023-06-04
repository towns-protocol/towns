package events

import (
	. "casablanca/node/base"
	. "casablanca/node/protocol"
	"fmt"
	"strconv"
	"strings"
)

// minitpoolInstance is a unique identifier of cookie generator. minipoolSlots are not necessary consistent across instances or even restarts.
// If minitpoolInstance is mismatching, then minipoolSlot is ignored and stream is synced from the end of the referenced miniblock.
// This is responsibility of the client to ignore duplicate events.
type SyncCookie struct {
	StreamId         string
	MiniblockNum     int
	MiniblockHashStr string
	MinipoolInstance string
	MinipoolSlot     int
}

func MakeSyncCookie(cookie SyncCookie) string {
	if strings.Contains(cookie.MinipoolInstance, "/") || strings.Contains(cookie.MiniblockHashStr, "/") {
		panic("MakeSyncCookie: minitpoolInstance or miniblockHashStr contains '/'")
	}
	return fmt.Sprintf("%d/%d/%s/%s/%s", cookie.MiniblockNum, cookie.MinipoolSlot, cookie.MinipoolInstance, cookie.MiniblockHashStr, cookie.StreamId)
}

func ParseSyncCookie(input string) (SyncCookie, error) {
	var cookie SyncCookie
	parts := strings.SplitN(input, "/", 5)
	if len(parts) != 5 {
		return cookie, RpcErrorf(Err_BAD_SYNC_COOKIE, "ParseSyncCookie: failed to parse sync cookie=%s, len(parts)=%d", input, len(parts))
	}

	block, err := strconv.ParseInt(parts[0], 10, 0)
	if err != nil {
		return cookie, RpcErrorf(Err_BAD_SYNC_COOKIE, "ParseSyncCookie: failed to parse miniblock number, cookie=%s, err=%v", input, err)
	}
	slot, err := strconv.ParseInt(parts[1], 10, 0)
	if err != nil {
		return cookie, RpcErrorf(Err_BAD_SYNC_COOKIE, "ParseSyncCookie: failed to parse minipool slot, cookie=%s, err=%v", input, err)
	}
	if len(parts[2]) <= 0 || len(parts[3]) <= 0 || len(parts[4]) <= 0 {
		return cookie, RpcErrorf(Err_BAD_SYNC_COOKIE, "ParseSyncCookie: empty part, cookie=%s", input)
	}

	cookie.MiniblockNum = int(block)
	cookie.MinipoolSlot = int(slot)
	cookie.MinipoolInstance = parts[2]
	cookie.MiniblockHashStr = parts[3]
	cookie.StreamId = parts[4]
	return cookie, nil
}
