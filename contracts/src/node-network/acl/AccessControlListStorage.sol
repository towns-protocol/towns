// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @author  HNT Labs
 * @title   Diamond Storage for the AccessControlListFacet.
 * @dev     AccessControlBase is the only contract that uses this library.
 * @dev     AccessControlListFacet, through AccessControlBase, makes use of this library.
 */

library AccessControlListStorage {
  // solhint-disable-next-line private-vars-leading-underscore
  bytes32 internal constant STORAGE_POSITION =
    keccak256("towns.node-network.inclusion.AccessControlListStorage");

  struct Layout {
    EnumerableSet.AddressSet allowlistSet;
    EnumerableSet.AddressSet blocklistSet;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 slot = STORAGE_POSITION;

    // solhint-disable-next-line no-inline-assembly
    assembly {
      ds.slot := slot
    }
  }
}
