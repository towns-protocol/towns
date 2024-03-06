// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

//interfaces

//libraries

//contracts

interface IMember {
  /// @notice emitted when an NFT is minted
  /// @param recipient the address that receives the NFT
  event Minted(address indexed recipient, uint256 tokenId, uint256 timestamp);

  /// @notice emitted when the mint state is changed
  /// @param caller the address that called the function
  /// @param prevState the previous mint state
  /// @param newState the new mint state
  /// @param timestamp the timestamp of the state change
  event MintStateChanged(
    address indexed caller,
    MintState indexed prevState,
    MintState indexed newState,
    uint256 timestamp
  );

  /// @notice thrown when user tries to mint more than 1 token with same wallet
  error AlreadyMinted();

  /// @notice thrown when an incorrect amount of ETH is sent to mint
  error MintPriceNotPaid();

  /// @notice thrown when the max supply is reached
  error MaxSupplyReached();

  /// @notice thrown when a token is not minted
  error NonExistentTokenURI();

  /// @notice thrown when the withdraw payment transaction fails
  error WithdrawTransfer();

  /// @notice thrown when the user is not allowed to perform the action
  error NotAllowed();

  /// @notice thrown when the mint state is invalid
  error InvalidMintState();

  /// @notice thrown when the address is invalid
  error InvalidAddress();

  /// @notice thrown when the proof is invalid
  error InvalidProof();

  /// @notice the current minting state
  enum MintState {
    Allowlist,
    Waitlist,
    Public
  }
}
