// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IBanningBase {
  error Banning__InvalidTokenId(uint256 tokenId);
}

interface IBanning is IBanningBase {
  function ban(string memory channelId, uint256 tokenId) external;

  function unban(string memory channelId, uint256 tokenId) external;

  function isBanned(
    string memory channelId,
    uint256 tokenId
  ) external view returns (bool);
}
