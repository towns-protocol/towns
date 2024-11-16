package shared

import (
	"github.com/ethereum/go-ethereum/common"

	"github.com/river-build/river/core/contracts/river"
	. "github.com/river-build/river/core/node/protocol"
)

type MiniblockRef struct {
	Hash common.Hash
	Num  int64
}

func MiniblockRefFromCookie(cookie *SyncCookie) *MiniblockRef {
	return &MiniblockRef{
		Hash: common.BytesToHash(cookie.GetPrevMiniblockHash()),
		Num:  max(cookie.GetMinipoolGen()-1, 0),
	}
}

func MiniblockRefFromLastHash(resp *GetLastMiniblockHashResponse) *MiniblockRef {
	return &MiniblockRef{
		Hash: common.BytesToHash(resp.GetHash()),
		Num:  resp.GetMiniblockNum(),
	}
}

func MiniblockRefFromContractRecord(stream *river.Stream) *MiniblockRef {
	return &MiniblockRef{
		Hash: stream.LastMiniblockHash,
		Num:  int64(stream.LastMiniblockNum),
	}
}
