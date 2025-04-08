package protocol

import (
	"github.com/ethereum/go-ethereum/common"
)

func (e *StreamEvent) GetStreamSettings() *StreamSettings {
	if e == nil {
		return nil
	}
	i := e.GetInceptionPayload()
	if i == nil {
		return nil
	}
	return i.GetSettings()
}

// NodeAddresses returns the addresses of the nodes in the CreationCookie.
func (cc *CreationCookie) NodeAddresses() []common.Address {
	if cc == nil {
		return nil
	}

	addresses := make([]common.Address, len(cc.Nodes))
	for i, node := range cc.Nodes {
		addresses[i] = common.BytesToAddress(node)
	}

	return addresses
}

// IsLocal returns true if the given address is in the CreationCookie.Nodes list.
func (cc *CreationCookie) IsLocal(addr common.Address) bool {
	if cc == nil {
		return false
	}

	for _, a := range cc.NodeAddresses() {
		if a.Cmp(addr) == 0 {
			return true
		}
	}

	return false
}

// CopyWithAddr returns a copy of the SyncCookie with the given address.
func (sc *SyncCookie) CopyWithAddr(address common.Address) *SyncCookie {
	return &SyncCookie{
		NodeAddress:       address.Bytes(),
		StreamId:          sc.GetStreamId(),
		MinipoolGen:       sc.GetMinipoolGen(),
		PrevMiniblockHash: sc.GetPrevMiniblockHash(),
	}
}

// GetMiniblockSnapshot returns the snapshot for the given miniblock number.
// Returns nil if the snapshot is not found.
func (x *GetMiniblocksResponse) GetMiniblockSnapshot(num int64) *Envelope {
	if x == nil || x.Snapshots == nil {
		return nil
	}

	return x.Snapshots[num]
}

// GetSnapshotByMiniblockIndex returns the snapshot by the given miniblock index in the list.
// StreamAndCookie contains a list of miniblocks starting from the latest snapshot.
// Meaning the first miniblock in the list is the latest snapshot.
// Meaning it returns the snapshot only when i is 0.
func (x *StreamAndCookie) GetSnapshotByMiniblockIndex(i int) *Envelope {
	if i == 0 {
		return x.GetSnapshot()
	}

	return nil
}

// IsSnapshot returns true if the miniblock header has a snapshot.
func (x *MiniblockHeader) IsSnapshot() bool {
	return x.GetSnapshot() != nil || len(x.GetSnapshotHash()) > 0
}
