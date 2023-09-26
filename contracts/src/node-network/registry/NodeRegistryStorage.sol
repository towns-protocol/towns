// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;
import {Node} from "./INodeRegistry.sol";

/**
 * @author  HNT Labs
 * @title   Diamond Storage for the NodeRegistryFacet.
 * @dev     NodeRegistryBase is the only contract that uses this library.
 * @dev     NodeRegistryFacet, through NodeRegistryBase, makes use of this library.
 */

library NodeRegistryStorage {
  // solhint-disable-next-line private-vars-leading-underscore
  bytes32 internal constant STORAGE_POSITION =
    keccak256("towns.node-network.registry.NodeRegistryStorage");

  struct Layout {
    mapping(address => Node) nodes;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 slot = STORAGE_POSITION;

    // solhint-disable-next-line no-inline-assembly
    assembly {
      ds.slot := slot
    }
  }
}
