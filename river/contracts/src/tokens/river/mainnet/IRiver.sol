// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IRiverBase {
  // =============================================================
  //                           Structs
  // =============================================================
  struct InflationConfig {
    uint256 initialInflationRate;
    uint256 finalInflationRate;
    uint256 inflationDecreaseRate;
    uint256 inflationDecreaseInterval;
  }

  struct RiverConfig {
    address vault;
    address owner;
    InflationConfig inflationConfig;
  }

  // =============================================================
  //                           Errors
  // =============================================================
  error River__InvalidInflationRate();
  error River__CannotMint();
  error River__CannotMintZero();
  error River__TransferLockEnabled();
  error River__InvalidDelegatee();
  error River__MintingTooSoon();
  error River__InvalidAddress();
  error River__DelegateeSameAsCurrent();
}

interface IRiver is IRiverBase {
  // =============================================================
  //                           Functions
  // =============================================================

  /// @notice create inflation
  /// @param to address to mint token to
  function createInflation(address to) external;

  /// @notice override inflation
  /// @param overrideInflation bool to override inflation
  /// @param overrideInflationRate uint256 to override inflation rate
  function setOverrideInflation(
    bool overrideInflation,
    uint256 overrideInflationRate
  ) external;
}
