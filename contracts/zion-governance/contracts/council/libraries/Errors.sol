//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

library Errors {
  /// @notice thrown when an incorrect amount of ETH is sent to mint
  error MintPriceNotPaid();

  /// @notice thrown when the max supply is reached
  error MaxSupply();

  /// @notice thrown when a token is not minted
  error NonExistentTokenURI();

  /// @notice thrown when the withdraw payment transaction fails
  error WithdrawTransfer();

  /// @notice thrown when user tries to mint more than 1 token with same wallet
  error AlreadyMinted();

  /// @notice thrown when no tokens are provided
  error NoTokensProvided();

  /// @notice thrown when a token is not owned by the user
  error NotTokenOwner();

  /// @notice thrown when no tokens are staked by user
  error NoStakedTokens();

  /// @notice thrown when no there are not points to claim by user
  error NoPointsToClaim();
}
