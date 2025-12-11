package nodes

import "github.com/ethereum/go-ethereum/common"

// NewNodeRecordForTest creates a minimal NodeRecord suitable for use in tests.
// It should not be used in production code.
func NewNodeRecordForTest(address common.Address, permanentIndex int) *NodeRecord {
	return &NodeRecord{
		address:        address,
		permanentIndex: permanentIndex,
	}
}
