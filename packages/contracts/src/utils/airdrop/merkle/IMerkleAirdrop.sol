// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// libraries

// contracts
interface IMerkleAirdropBase {
    struct AirdropClaim {
        address account;
        uint256 amount;
        address receiver;
    }

    event Claimed(address account, uint256 amount, address recipient);
    event MerkleRootUpdated(bytes32 merkleRoot);

    error MerkleAirdrop__InvalidProof();
    error MerkleAirdrop__AlreadyClaimed();
    error MerkleAirdrop__InvalidSignature();
}

interface IMerkleAirdrop is IMerkleAirdropBase {
    /// @notice Computes the hash of the EIP-712 typed data for an airdrop claim
    /// @param account The address of the account claiming the airdrop
    /// @param amount The amount of tokens to be claimed
    /// @return The computed message hash
    function getMessageHash(
        address account,
        uint256 amount,
        address receiver
    ) external view returns (bytes32);

    /// @notice Retrieves the current Merkle root used for verifying claims
    /// @return The current Merkle root
    function getMerkleRoot() external view returns (bytes32);

    /// @notice Gets the ERC20 token used for the airdrop
    /// @return The IERC20 interface of the airdrop token
    function getToken() external view returns (IERC20);

    /// @notice Allows a user to claim their airdrop tokens
    /// @param account The address of the account claiming the airdrop
    /// @param amount The amount of tokens to be claimed
    /// @param merkleProof The merkle proof for the claim
    /// @param signature The EIP-712 signature authorizing the claim
    function claim(
        address account,
        uint256 amount,
        bytes32[] calldata merkleProof,
        bytes calldata signature,
        address receiver
    ) external;
}
