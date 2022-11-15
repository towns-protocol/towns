//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

library CouncilDataTypes {
  /// @notice A struct containing a staked token
  struct StakedToken {
    // wallet address of user
    address staker;
    // token id of the nft being staked
    uint256 tokenId;
  }

  /// @notice A struct containing a single staker
  struct Staker {
    // amount of tokens staked
    uint256 amountStaked;
    // staked token ids
    StakedToken[] stakedTokens;
    // last time the points were calculated for this user
    uint256 timeOfLastUpdate;
    // calculated, but unclaimed points for the user
    // points are calculated each time the user writes to the contract
    uint256 unclaimedPoints;
  }
}
