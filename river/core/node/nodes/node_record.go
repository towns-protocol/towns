package nodes

import (
	"fmt"

	"github.com/ethereum/go-ethereum/common"
	"github.com/river-build/river/core/node/contracts"
	. "github.com/river-build/river/core/node/protocol/protocolconnect"
)

// NodeRecord is immutable and so can be passed by pointer.
type NodeRecord struct {
	address             common.Address
	operator            common.Address
	url                 string
	status              uint8
	local               bool
	streamServiceClient StreamServiceClient
	nodeToNodeClient    NodeToNodeClient
}

func (n *NodeRecord) Address() common.Address {
	return n.address
}

func (n *NodeRecord) Operator() common.Address {
	return n.operator
}

func (n *NodeRecord) Url() string {
	return n.url
}

func (n *NodeRecord) Status() uint8 {
	return n.status
}

func (n *NodeRecord) Local() bool {
	return n.local
}

func (n *NodeRecord) StreamServiceClient() StreamServiceClient {
	return n.streamServiceClient
}

func (n *NodeRecord) NodeToNodeClient() NodeToNodeClient {
	return n.nodeToNodeClient
}

func (n *NodeRecord) String() string {
	var local string
	if n.local {
		local = " local"
	}
	return fmt.Sprintf(
		"%s %d (%-11s) %s%s %s",
		n.address.Hex(),
		n.status,
		contracts.NodeStatusString(n.status),
		n.url,
		local,
		n.operator.Hex(),
	)
}

func (n *NodeRecord) GoString() string {
	return "NodeRecord{" + n.String() + "}\n"
}
