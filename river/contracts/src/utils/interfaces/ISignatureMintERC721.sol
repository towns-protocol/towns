// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces

// libraries

// contracts

interface ISignatureMintERC721 {
  /// @notice Struct representing the signature for a mint call.
  struct MintRequest {
    address to;
    address royaltyReceiver;
    uint256 royaltyValue;
    address primarySaleReceiver;
    string uri;
    uint256 quantity;
    uint256 pricePerToken;
    address currency;
    uint128 validityStartTimestamp;
    uint128 validityEndTimestamp;
    bytes32 uid;
  }

  /// @dev Emitted when tokens are minted.
  event TokensMintedWithSignature(
    address indexed signer,
    address indexed mintedTo,
    uint256 indexed tokenId,
    MintRequest mintRequest
  );

  /// @notice Verifies that a mint request is signed by an account holding MINTER_ROLE
  /// @param mintRequest The payload of the mint request
  /// @param signature The signature of the mint request
  /// @return success True if the mint request is signed by an account holding MINTER_ROLE
  /// @return signer The address of the signer
  function verify(
    MintRequest calldata mintRequest,
    bytes calldata signature
  ) external view returns (bool success, address signer);

  /// @notice Mints tokens according to a mint request
  /// @param mintRequest The payload of the mint request
  /// @param signature The signature of the mint request
  /// @return signer The address of the signer
  function mintWithSignature(
    MintRequest calldata mintRequest,
    bytes calldata signature
  ) external payable returns (address signer);
}
