// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IPOAP {
  /// @notice Get the POAP token balance of an owner
  /// @param owner The address to query the balance of
  /// @return The number of POAP tokens owned by the given address
  function balanceOf(address owner) external view returns (uint256);

  ///  @dev Gets the Token Id and Event Id for a given index of the tokens list of the requested owner
  ///  @param owner ( address ) Owner address of the token list to be queried
  ///  @param index ( uint256 ) Index to be accessed of the requested tokens list
  /// @return tokenId The unique identifier of the POAP token
  /// @return eventId The ID of the event associated with the POAP token
  function tokenDetailsOfOwnerByIndex(
    address owner,
    uint256 index
  ) external view returns (uint256 tokenId, uint256 eventId);
}
