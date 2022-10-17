//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

library Events {
  /// @notice emitted when an NFT is minted
  /// @param recipient the address that receives the NFT
  event Minted(address indexed recipient);

  /// @notice emitted when tokens are staked
  /// @param user the staker
  /// @param tokenId the ids of the tokens being staked
  event Staked(address indexed user, uint256 tokenId);

  /// @notice emitted when tokens are withdrawn
  /// @param user the unstaker
  /// @param tokenId the ids of the tokens being removed
  event Withdraw(address indexed user, uint256 tokenId);

  /// @notice emitted when points are claimed
  /// @param user the wallet
  /// @param points the points claimed by the user
  event PointsClaimed(address indexed user, uint256 points);
}
