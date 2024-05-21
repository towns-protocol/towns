// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Claim condition interface
/// @notice A claim condition is a set of criteria that must be met for a claim to be valid. At any moment there is only one claim condition active.
interface IClaimCondition {
  /// @notice Criteria for a claim to be valid
  /// @param startTimestamp The unix timestamp after which the claim is valid
  /// @param maxClaimableSupply The maximum total number of tokens that can be claimed under the claim condition
  /// @param supplyClaimed At any point, the number of tokens that have been claimed under the claim condition
  /// @param limitPerWallet The maximum number of tokens that can be claimed by a wallet
  /// @param merkleRoot The allowlist of addresses that can claim tokens under this condition
  /// @param pricePerToken The price required to pay per token claimed
  /// @param currency The currency used to pay for the tokens
  /// @param metadata Claim condition metadata
  struct ClaimCondition {
    uint256 startTimestamp;
    uint256 maxClaimableSupply;
    uint256 supplyClaimed;
    uint256 limitPerWallet;
    bytes32 merkleRoot;
    uint256 pricePerToken;
    address currency;
    string metadata;
  }
}
