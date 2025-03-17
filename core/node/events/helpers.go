package events

import (
	"github.com/ethereum/go-ethereum/common"
)

// WithAvailableNode calls the given callback function for each peer until the callback returns nil
// or there are no more peers to call. If the targetNode is empty, the callback is called for each peer.
func (s *Stream) WithAvailableNode(targetNode []byte, cb func(common.Address) error) error {
	getNodeAddress := func() (common.Address, bool) {
		return common.BytesToAddress(targetNode), false
	}
	if len(targetNode) == 0 {
		i := 0
		remotes, useLocal := s.GetRemotesAndIsLocal()
		nodeAddress := s.GetStickyPeer()
		getNodeAddress = func() (common.Address, bool) {
			if i == 0 && useLocal {
				useLocal = false
				return s.params.Wallet.Address, len(remotes) > 0
			}
			if i > 0 {
				nodeAddress = s.AdvanceStickyPeer(nodeAddress)
			}
			i++
			return nodeAddress, i < len(remotes)
		}
	}

	for {
		nodeAddress, more := getNodeAddress()
		if err := cb(nodeAddress); err != nil {
			if more {
				continue
			}
			return err
		}
		return nil
	}
}
