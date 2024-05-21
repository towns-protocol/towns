// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces
import {IClaimConditionMultiPhase} from "./IClaimConditionMultiPhase.sol";

/**
 * @title Drop interface
 * @notice Distribution mechanism for a token
 * @dev An authorized account can create a series of claim conditions, ordered by their `startTimestamp`.
 *    - A condition defines a set of criteria that must be met for a claim to be valid.
 *    - They can be overwritten or added to by the authorized account. There can only be one active claim condition at a time.
 */
interface IDrop is IClaimConditionMultiPhase {
  /// @notice A struct representing an allowlist proof
  /// @param proof The proof data for the allowlist
  /// @param limitPerWallet The maximum amount that can be claimed per wallet
  /// @param pricePerToken The price required to pay per token claimed
  /// @param currency The currency used to pay for the tokens
  struct AllowlistProof {
    bytes32[] proof;
    uint256 limitPerWallet;
    uint256 pricePerToken;
    address currency;
  }

  /// @notice An event emitted when tokens are claimed via `claim`.
  /// @param claimer The address of the claimer
  /// @param receiver The address of the receiver
  /// @param clainConditionIndex The index of the claim condition
  /// @param startTokenId The start token id
  /// @param quantityClaimed The quantity claimed
  event TokensClaimed(
    uint256 indexed clainConditionIndex,
    address indexed claimer,
    address indexed receiver,
    uint256 startTokenId,
    uint256 quantityClaimed
  );

  /// @notice An event emitted when claim conditions are updated.
  /// @param claimConditions The claim conditions
  /// @param resetEligibility Whether the eligibility of the claim conditions should be reset
  event ClaimConditionsUpdated(
    ClaimCondition[] claimConditions,
    bool resetEligibility
  );

  /// @notice Allow an account to claim a quantity of tokens
  /// @param receiver The address of the receiver
  /// @param quantity The quantity of tokens to claim
  /// @param currency The currency used to pay for the tokens
  /// @param pricePerToken The price required to pay per token claimed
  /// @param allowlistProof The proof data for the allowlist
  /// @param data Additional data for the claim
  function claim(
    address receiver,
    uint256 quantity,
    address currency,
    uint256 pricePerToken,
    AllowlistProof calldata allowlistProof,
    bytes memory data
  ) external payable;

  /// @notice Allows an admin account to update the claim conditions
  /// @param phases The claim conditions in ascending order by `startTimestamp`
  /// @param resetEligibility Whether to honor the restrictions applied to account that have already claimed tokens, or to reset them
  function setClaimConditions(
    ClaimCondition[] calldata phases,
    bool resetEligibility
  ) external;
}
