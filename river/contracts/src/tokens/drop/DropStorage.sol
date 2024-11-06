// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDropFacetBase} from "./IDropFacet.sol";

// libraries

// contracts

library DropStorage {
  // keccak256(abi.encode(uint256(keccak256("diamond.facets.drop.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 constant STORAGE_SLOT =
    0xeda6a1e2ce6f1639b6d3066254ca87a2daf51c4f0ad5038d408bbab6cc2cab00;

  struct SupplyClaim {
    uint256 claimed;
    uint256 depositId;
  }

  struct Layout {
    address rewardsDistribution;
    uint48 conditionStartId;
    uint48 conditionCount;
    uint48 highestConditionId;
    mapping(uint256 conditionId => mapping(address => SupplyClaim)) supplyClaimedByWallet;
    mapping(uint256 conditionId => IDropFacetBase.ClaimCondition) conditionById;
  }

  function layout() internal pure returns (Layout storage l) {
    assembly {
      l.slot := STORAGE_SLOT
    }
  }

  function getClaimConditionById(
    Layout storage ds,
    uint256 conditionId
  ) internal view returns (IDropFacetBase.ClaimCondition storage) {
    return ds.conditionById[conditionId];
  }

  function getSupplyClaimedByWallet(
    Layout storage ds,
    uint256 conditionId,
    address account
  ) internal view returns (SupplyClaim storage) {
    return ds.supplyClaimedByWallet[conditionId][account];
  }
}
