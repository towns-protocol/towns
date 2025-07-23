package protocol

import (
	"github.com/ethereum/go-ethereum/common"
)

const (
	// UseSharedSyncHeaderName is the header name that indicates whether to use the shared syncer or not.
	UseSharedSyncHeaderName = "X-Use-Shared-Sync"
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
	if x == nil || x.Snapshots == nil || len(x.Snapshots) == 0 {
		return nil
	}

	return x.Snapshots[num]
}

// TargetSyncIDs returns the list of target sync IDs from the ModifySyncRequest.
func (r *ModifySyncRequest) TargetSyncIDs() []string {
	var targetSyncIds []string

	if r.SyncId != "" {
		targetSyncIds = append(targetSyncIds, r.SyncId)
	}

	if r.GetBackfillStreams().GetSyncId() != "" && r.GetBackfillStreams().GetSyncId() != r.SyncId {
		targetSyncIds = append(targetSyncIds, r.GetBackfillStreams().GetSyncId())
	}

	return targetSyncIds
}

// StreamID returns the stream ID from the SyncStreamsResponse.
// Depending on the operation type, it can be either from the message itself
// or from the next sync cookie of the stream.
func (r *SyncStreamsResponse) StreamID() []byte {
	if r == nil {
		return nil
	}

	if r.GetSyncOp() == SyncOp_SYNC_DOWN {
		return r.GetStreamId()
	}

	return r.GetStream().GetNextSyncCookie().GetStreamId()
}
