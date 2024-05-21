// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
interface ISpaceOwnerBase {
  struct Space {
    string name;
    string uri;
    uint256 tokenId;
    uint256 createdAt;
  }

  error SpaceOwner__OnlyFactoryAllowed();
  error SpaceOwner__OnlySpaceOwnerAllowed();

  event SpaceOwner__UpdateSpace(address indexed space);
  event SpaceOwner__SetFactory(address factory);
}

interface ISpaceOwner is ISpaceOwnerBase {
  /// @notice Set the factory address that is allowed to mint spaces
  function setFactory(address factory) external;

  /// @notice Get the factory address
  function getFactory() external view returns (address);

  /// @notice Get the next token id that will be used to mint a space
  function nextTokenId() external view returns (uint256);

  /// @notice Mint a space
  /// @dev Only the factory is allowed to mint spaces
  /// @param name The name of the space
  /// @param uri The URI of the space
  /// @param space The address of the space
  /// @return tokenId The token id of the minted space
  function mintSpace(
    string memory name,
    string memory uri,
    address space
  ) external returns (uint256 tokenId);

  /// @notice Get the space info
  /// @param space The address of the space
  /// @return space The space info
  function getSpaceInfo(address space) external view returns (Space memory);

  /// @notice Update the space info
  /// @dev Only the space owner is allowed to update the space info
  /// @param space The address of the space
  /// @param name The name of the space
  /// @param uri The URI of the space
  function updateSpaceInfo(
    address space,
    string memory name,
    string memory uri
  ) external;
}
