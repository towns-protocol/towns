// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IMembershipMetadata {
  /// @notice Emits an event to trigger metadata refresh when the space info is updated
  function refreshMetadata() external;

  function tokenURI(uint256 tokenId) external view returns (string memory);
}
