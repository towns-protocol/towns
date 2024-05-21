// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces
import {IClaimCondition} from "./IClaimCondition.sol";

// libraries

// contracts

interface IClaimConditionMultiPhase is IClaimCondition {
  /// @notice A list of all claim conditions
  /// @dev Claim Phase ID = [currentStartId, currentStartId + claimConditions.length - 1]
  /// @param currentStartId The uid for the first claim condition in the list. The uid for the next claim condition is one more than the previous claim condition's uid.
  /// @param count The total number of phases / claim conditions in the list
  /// @param conditions The claim conditions at a given uid. Claim conditions are ordered in ascending order by their `startTimestamp`.
  /// @param supplyClaimedByWallet Map from a claim condition uid and account to supply claimed by an account.
  struct ClaimConditionList {
    uint256 currentStartId;
    uint256 count;
    mapping(uint256 => ClaimCondition) conditions;
    mapping(uint256 => mapping(address => uint256)) supplyClaimedByWallet;
  }
}
