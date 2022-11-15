//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

interface ISpace {
  /// @notice Mints a space nft by space id
  function mintBySpaceId(uint256 spaceId, address spaceOwner) external;

  /// @notice Returns the owner of the space by space id
  function getOwnerBySpaceId(uint256 spaceId) external view returns (address);
}
