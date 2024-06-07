// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IBanningBase {
  // =============================================================
  //                           Errors
  // =============================================================
  error Banning__InvalidTokenId(uint256 tokenId);
  error Banning__AlreadyBanned(uint256 tokenId);
  error Banning__NotBanned(uint256 tokenId);
  error Banning__CannotBanSelf();
  error Banning__CannotBanOwner();

  // =============================================================
  //                           Events
  // =============================================================
  event Banned(address indexed moderator, uint256 indexed tokenId);
  event Unbanned(address indexed moderator, uint256 indexed tokenId);
}

interface IBanning is IBanningBase {
  function ban(uint256 tokenId) external;

  function unban(uint256 tokenId) external;

  function isBanned(uint256 tokenId) external view returns (bool);

  function banned() external view returns (uint256[] memory);
}
