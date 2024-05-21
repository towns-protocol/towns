// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces

// libraries

// contracts

interface IAirdropERC721 {
  /// @notice Emitted when airdrop recipients are uploaded to the contract
  event RecipientAdded(Airdrop[] airdrops);

  /// @notice Emitted when an airdrop payment is made to the recipient
  event AirdropPayment(address indexed recipient, Airdrop airdrop);

  /// @notice Details of amount of recipient for airdrop
  /// @param tokenAddress The contract address of the token to transfer
  /// @param tokenOwner The owner of the tokens to transfer
  /// @param recipient The recipient of the tokens
  /// @param tokenId The ID of the ERC721 token being transferred
  struct Airdrop {
    address tokenAddress;
    address tokenOwner;
    address recipient;
    uint256 tokenId;
  }

  /// @notice Returns all airdrop payments set up --- pending, processed or failed
  function getAllAirdropPayments()
    external
    view
    returns (Airdrop[] memory airdrops);

  /// @notice Returns all pending airdrop payments
  function getallAirdropPaymentsPending()
    external
    view
    returns (Airdrop[] memory airdrops);

  /// @notice Returns all pending airdrop payments processed
  function getallAirdropPaymentsProcessed()
    external
    view
    returns (Airdrop[] memory airdrops);

  /// @notice Returns all pending airdrop payments failed
  function getallAirdropPaymentsFailed()
    external
    view
    returns (Airdrop[] memory airdrops);

  /// @notice Lets contract owner set up and airdrop of ERC721 tokens to a list of recipients
  /// @dev The token-owner should approve target tokens to Airdrop contract, which acts as operator for the tokens.
  /// @param airdrops The list of airdrop recipients, tokenIds to airdrop
  function addAirdropRecipients(Airdrop[] calldata airdrops) external;

  /// @notice Lets contract owner set up an airdrop of ERC721 tokens to a list of recipients
  /// @dev The token-owner should approve target tokens to Airdrop contract, which acts as operator of the tokens.
  /// @param paymentsToProcess The number of airdrop payments to process
  function airdrop(uint256 paymentsToProcess) external;
}
