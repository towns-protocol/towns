// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDropFacetBase} from "./IDropFacet.sol";

// libraries

import {BasisPoints} from "src/utils/libraries/BasisPoints.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";
import {MerkleProofLib} from "solady/utils/MerkleProofLib.sol";

// contracts

library DropClaimLib {
    using MerkleProofLib for bytes32[];

    /// @notice A struct representing a claim
    /// @param conditionId The ID of the claim condition
    /// @param account The address of the account that claimed
    /// @param quantity The quantity of tokens claimed
    /// @param proof The proof of the claim
    struct Claim {
        uint256 conditionId;
        address account;
        uint256 quantity;
        bytes32[] proof;
    }

    /// @notice A struct representing a supply claim
    /// @param claimed The amount of tokens claimed
    /// @param depositId The deposit ID of the claim
    struct SupplyClaim {
        uint256 claimed;
        uint256 depositId;
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

    function updateClaim(
        ClaimCondition storage condition,
        SupplyClaim storage claimed,
        uint256 amount
    ) internal {
        condition.supplyClaimed += amount;
        unchecked {
            claimed.claimed += amount;
        }
    }

    function updateClaimCondition(
        ClaimCondition storage self,
        ClaimCondition calldata newCondition
    ) internal {
        self.startTimestamp = newCondition.startTimestamp;
        self.endTimestamp = newCondition.endTimestamp;
        self.maxClaimableSupply = newCondition.maxClaimableSupply;
        self.merkleRoot = newCondition.merkleRoot;
        self.currency = newCondition.currency;
        self.penaltyBps = newCondition.penaltyBps;
    }

    function verifyClaim(
        ClaimCondition storage condition,
        SupplyClaim storage claimed,
        Claim calldata claim
    ) internal view {
        if (condition.merkleRoot == bytes32(0)) {
            CustomRevert.revertWith(IDropFacetBase.DropFacet__MerkleRootNotSet.selector);
        }

        if (claim.quantity == 0) {
            CustomRevert.revertWith(
                IDropFacetBase.DropFacet__QuantityMustBeGreaterThanZero.selector
            );
        }

        if (condition.currency == address(0)) {
            CustomRevert.revertWith(IDropFacetBase.DropFacet__CurrencyNotSet.selector);
        }

        // Check if the total claimed supply (including the current claim) exceeds the maximum
        // claimable
        // supply
        if (condition.supplyClaimed + claim.quantity > condition.maxClaimableSupply) {
            CustomRevert.revertWith(IDropFacetBase.DropFacet__ExceedsMaxClaimableSupply.selector);
        }

        if (block.timestamp < condition.startTimestamp) {
            CustomRevert.revertWith(IDropFacetBase.DropFacet__ClaimHasNotStarted.selector);
        }

        if (condition.endTimestamp > 0 && block.timestamp >= condition.endTimestamp) {
            CustomRevert.revertWith(IDropFacetBase.DropFacet__ClaimHasEnded.selector);
        }

        // check if already claimed
        if (claimed.claimed > 0) {
            CustomRevert.revertWith(IDropFacetBase.DropFacet__AlreadyClaimed.selector);
        }

        bytes32 leaf = createLeaf(claim.account, claim.quantity);
        if (!claim.proof.verifyCalldata(condition.merkleRoot, leaf)) {
            CustomRevert.revertWith(IDropFacetBase.DropFacet__InvalidProof.selector);
        }
    }

    function verifyPenaltyBps(
        ClaimCondition storage self,
        Claim calldata claim,
        uint16 expectedPenaltyBps
    ) internal view returns (uint256 amount) {
        uint16 penaltyBps = self.penaltyBps;
        if (penaltyBps != expectedPenaltyBps) {
            CustomRevert.revertWith(IDropFacetBase.DropFacet__UnexpectedPenaltyBps.selector);
        }

        amount = claim.quantity;
        if (penaltyBps > 0) {
            unchecked {
                uint256 penaltyAmount = BasisPoints.calculate(claim.quantity, penaltyBps);
                amount = claim.quantity - penaltyAmount;
            }
        }

        return amount;
    }

    function createLeaf(address account, uint256 amount) internal pure returns (bytes32 leaf) {
        assembly ("memory-safe") {
            // Store the account address at memory location 0
            mstore(0, account)
            // Store the amount at memory location 0x20 (32 bytes after the account address)
            mstore(0x20, amount)
            // Compute the keccak256 hash of the account and amount, and store it at memory location
            // 0
            mstore(0, keccak256(0, 0x40))
            // Compute the keccak256 hash of the previous hash (stored at memory location 0) and
            // store it
            // in the leaf variable
            leaf := keccak256(0, 0x20)
        }
    }
}
