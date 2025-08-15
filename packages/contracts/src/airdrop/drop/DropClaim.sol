// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDropFacetBase} from "./IDropFacet.sol";

// libraries
import {CustomRevert} from "../../utils/libraries/CustomRevert.sol";
import {MerkleProofLib} from "solady/utils/MerkleProofLib.sol";

// contracts

library DropClaim {
    using MerkleProofLib for bytes32[];
    using CustomRevert for bytes4;

    /// @notice A struct representing a claim
    /// @param conditionId The ID of the claim condition
    /// @param account The address of the account that claimed
    /// @param recipient The address of the recipient of the tokens
    /// @param quantity The quantity of tokens claimed
    /// @param points The points to be burned
    /// @param proof The proof of the claim
    struct Claim {
        uint256 conditionId;
        address account;
        address recipient;
        uint256 quantity;
        uint256 points;
        bytes32[] proof;
    }

    function verify(Claim calldata claim, bytes32 root) internal pure {
        bytes32 leaf = createLeaf(claim);
        if (!claim.proof.verifyCalldata(root, leaf)) {
            IDropFacetBase.DropFacet__InvalidProof.selector.revertWith();
        }
    }

    function createLeaf(Claim calldata claim) internal pure returns (bytes32 leaf) {
        address account = claim.account;
        uint256 quantity = claim.quantity;
        uint256 points = claim.points;
        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0, account)
            mstore(0x20, quantity)
            mstore(0x40, points)
            leaf := keccak256(0, 0x60)
            mstore(0, leaf)
            leaf := keccak256(0, 0x20)
            mstore(0x40, fmp)
        }
    }
}
