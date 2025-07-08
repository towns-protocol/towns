// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDropFacetBase} from "./IDropFacet.sol";

// libraries
import {BasisPoints} from "../../utils/libraries/BasisPoints.sol";
import {CustomRevert} from "../../utils/libraries/CustomRevert.sol";

// contracts

library DropGroup {
    using CustomRevert for bytes4;

    /// @notice The layout of the drop group
    /// @param supplyClaimedByWallet A mapping of addresses to their claimed amounts and deposit IDs
    /// @param condition The current claim condition
    struct Layout {
        mapping(address => Claimed) supplyClaimedByWallet;
        ClaimCondition condition;
    }

    /// @notice A struct representing a claimed drop
    /// @param amount The amount of tokens claimed
    /// @param depositId The deposit ID of the claim
    /// @param lockStart The timestamp when the lock started
    /// @param lockDuration The duration of the lock in seconds
    struct Claimed {
        uint256 amount;
        uint256 depositId;
        uint48 lockStart;
        uint48 lockDuration;
    }

    /// @notice A struct representing a claim condition
    /// @param currency The currency to claim in
    /// @param startTimestamp The timestamp at which the claim condition starts
    /// @param endTimestamp The timestamp at which the claim condition ends
    /// @param penaltyBps The penalty in basis points for early withdrawal
    /// @param maxClaimableSupply The maximum claimable supply for the claim condition
    /// @param supplyClaimed The supply already claimed for the claim condition
    /// @param merkleRoot The merkle root for the claim condition
    struct ClaimCondition {
        address currency;
        uint40 startTimestamp;
        uint40 endTimestamp;
        uint16 penaltyBps;
        uint256 maxClaimableSupply;
        uint256 supplyClaimed;
        bytes32 merkleRoot;
    }

    /// @notice Updates to the claim condition except for `supplyClaimed`
    /// @param self The drop group
    /// @param newCondition The new claim condition
    function updateClaimCondition(
        Layout storage self,
        ClaimCondition calldata newCondition
    ) internal {
        ClaimCondition storage condition = self.condition;
        condition.startTimestamp = newCondition.startTimestamp;
        condition.endTimestamp = newCondition.endTimestamp;
        condition.maxClaimableSupply = newCondition.maxClaimableSupply;
        condition.merkleRoot = newCondition.merkleRoot;
        condition.currency = newCondition.currency;
        condition.penaltyBps = newCondition.penaltyBps;
    }

    /// @notice Claims the amount of tokens for the claim
    /// @param self The drop group
    /// @param account The claiming account
    /// @param amount The amount of tokens to claim
    function claim(Layout storage self, address account, uint256 amount) internal {
        Claimed storage claimed = self.supplyClaimedByWallet[account];
        // check if already claimed
        if (claimed.amount > 0) {
            IDropFacetBase.DropFacet__AlreadyClaimed.selector.revertWith();
        }

        self.condition.supplyClaimed += amount;
        claimed.amount = amount;
    }

    /// @notice Verifies the claim condition
    /// @param self The drop group
    /// @param amount The amount of tokens to claim
    function verify(Layout storage self, uint256 amount) internal view {
        ClaimCondition storage condition = self.condition;
        if (condition.merkleRoot == bytes32(0)) {
            IDropFacetBase.DropFacet__MerkleRootNotSet.selector.revertWith();
        }

        if (amount == 0) {
            IDropFacetBase.DropFacet__QuantityMustBeGreaterThanZero.selector.revertWith();
        }

        if (condition.currency == address(0)) {
            IDropFacetBase.DropFacet__CurrencyNotSet.selector.revertWith();
        }

        // check if the total claimed supply (including the current claim) exceeds the maximum
        // claimable supply
        if (condition.supplyClaimed + amount > condition.maxClaimableSupply) {
            IDropFacetBase.DropFacet__ExceedsMaxClaimableSupply.selector.revertWith();
        }

        if (block.timestamp < condition.startTimestamp) {
            IDropFacetBase.DropFacet__ClaimHasNotStarted.selector.revertWith();
        }

        if (condition.endTimestamp > 0 && block.timestamp >= condition.endTimestamp) {
            IDropFacetBase.DropFacet__ClaimHasEnded.selector.revertWith();
        }
    }

}
