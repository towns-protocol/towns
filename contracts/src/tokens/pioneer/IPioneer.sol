// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts

interface IPioneerBase {
  event SetAllowed(address indexed user, bool allow);

  error NotAllowed();
  error NonExistentTokenURI();
  error MaxSupplyReached();
  error InsufficientBalance();
  error InvalidRewardValue();
  error AlreadyAllowed();
  error AlreadyMinted();
}

interface IPioneer is IPioneerBase {
  // =============================================================
  //                           Minting
  // =============================================================

  /**
   * @notice Mint a new token
   * @param to Address to mint to
   * @return New token ID
   */
  function mintTo(address to) external returns (uint256);

  // =============================================================
  //                           Admin
  // =============================================================

  /**
   * @notice Withdraw the contract balance to an address
   * @param to Address to withdraw to
   */
  function withdraw(address to) external;

  /**
   * @notice Allow or disallow an address to mint new tokens
   * @param user Address to allow or disallow
   * @param allow Whether or not to allow the address to mint new tokens
   */
  function setAllowed(address user, bool allow) external;

  /**
   * @notice Set the base URI for all token IDs
   * @param baseURI New base URI
   */
  function setBaseURI(string memory baseURI) external;

  /**
   * @notice Set the mint reward
   * @param mintReward New mint reward
   */
  function setMintReward(uint256 mintReward) external;

  /**
   * @notice Get the mint reward
   * @return Mint reward
   */
  function getMintReward() external view returns (uint256);
}
