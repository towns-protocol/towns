package shared

import (
	"fmt"

	"github.com/ethereum/go-ethereum/common"

	. "github.com/towns-protocol/towns/core/node/protocol"
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

func (m MiniblockRef) String() string {
	return fmt.Sprintf("MB %d %s", m.Num, m.Hash.Hex())
}

func (m MiniblockRef) GoString() string {
	return m.String()
}
