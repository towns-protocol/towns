// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// helpers
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

// contracts
import {RiverRegistry} from "contracts/src/river/registry/RiverRegistry.sol";

contract RiverRegistryHelper is FacetHelper {
  RiverRegistry internal registry;

  constructor() {
    registry = new RiverRegistry();

    bytes4[] memory selectors_ = new bytes4[](21);
    selectors_[_index++] = RiverRegistry.allocateStream.selector;
    selectors_[_index++] = RiverRegistry.approveOperator.selector;
    selectors_[_index++] = RiverRegistry.getAllNodeAddresses.selector;
    selectors_[_index++] = RiverRegistry.getAllNodes.selector;
    selectors_[_index++] = RiverRegistry.getAllStreamIds.selector;
    selectors_[_index++] = RiverRegistry.getAllStreams.selector;
    selectors_[_index++] = RiverRegistry.getNode.selector;
    selectors_[_index++] = RiverRegistry.getNodeCount.selector;
    selectors_[_index++] = RiverRegistry.getStream.selector;
    selectors_[_index++] = RiverRegistry.getStreamCount.selector;
    selectors_[_index++] = RiverRegistry.getStreamWithGenesis.selector;
    selectors_[_index++] = RiverRegistry.getStreamsOnNode.selector;
    selectors_[_index++] = RiverRegistry.isOperator.selector;
    selectors_[_index++] = RiverRegistry.placeStreamOnNode.selector;
    selectors_[_index++] = RiverRegistry.registerNode.selector;
    selectors_[_index++] = RiverRegistry.removeNode.selector;
    selectors_[_index++] = RiverRegistry.removeOperator.selector;
    selectors_[_index++] = RiverRegistry.removeStreamFromNode.selector;
    selectors_[_index++] = RiverRegistry.setStreamLastMiniblock.selector;
    selectors_[_index++] = RiverRegistry.updateNodeStatus.selector;
    selectors_[_index++] = RiverRegistry.updateNodeUrl.selector;

    addSelectors(selectors_);
  }

  function facet() public view override returns (address) {
    return address(registry);
  }

  function selectors() public view override returns (bytes4[] memory) {
    return functionSelectors;
  }

  function initializer() public pure override returns (bytes4) {
    return RiverRegistry.__RiverRegistry_init.selector;
  }

  function makeInitData(
    address[] memory operators
  ) public pure returns (bytes memory) {
    return abi.encodeWithSelector(initializer(), operators);
  }
}
