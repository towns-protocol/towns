// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

import {NodeStatusFacet, INodeStatus} from "contracts/src/node/status/NodeStatusFacet.sol";

contract NodeStatusHelper is FacetHelper {
  NodeStatusFacet internal nodeStatus;

  constructor() {
    nodeStatus = new NodeStatusFacet();
  }

  function facet() public view override returns (address) {
    return address(nodeStatus);
  }

  function selectors() public pure override returns (bytes4[] memory) {
    bytes4[] memory selector_ = new bytes4[](5);

    selector_[0] = INodeStatus.signalIntentToEnter.selector;
    selector_[1] = INodeStatus.signalIntentToActivate.selector;
    selector_[2] = INodeStatus.signalIntentToCrash.selector;
    selector_[3] = INodeStatus.signalIntentToExit.selector;
    selector_[4] = INodeStatus.getStatus.selector;
    return selector_;
  }

  function initializer() public pure override returns (bytes4) {
    return NodeStatusFacet.__NodeStatus_init.selector;
  }
}
