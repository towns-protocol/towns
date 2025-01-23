// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface ITownsBase {
  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Structs                          */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
  struct InflationConfig {
    uint256 initialMintTime;
    uint256 initialInflationRate;
    uint256 finalInflationRate;
    uint256 finalInflationYears;
    uint256 inflationDecayRate;
    address inflationReceiver;
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Errors                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
  error InvalidAddress();
  error InvalidInflationRate();
  error MintingTooSoon();
  error InitialSupplyAlreadyMinted();
}

interface ITowns is ITownsBase {
  /// @notice Mints the initial supply to the given address
  /// @dev Can only be called by the owner
  /// @dev Can only be called once
  function mintInitialSupply(address to) external;

  /// @notice Creates new tokens according to the current inflation rate
  /// @dev Can only be called by accounts with ROLE_INFLATION_MANAGER
  /// @dev Mints tokens to the inflation receiver based on current total supply and inflation rate
  /// @dev Updates lastMintTime to current block timestamp after minting
  function createInflation() external;

  /// @notice Allows the inflation rate manager to override the normal inflation rate
  /// @param overrideInflation Whether to override the normal inflation rate
  /// @param overrideInflationRate The inflation rate to use when overriding, in basis points
  /// @dev Can only be called by accounts with ROLE_INFLATION_RATE_MANAGER
  /// @dev overrideInflationRate must be less than or equal to finalInflationRate
  function setOverrideInflation(
    bool overrideInflation,
    uint256 overrideInflationRate
  ) external;

  /// @notice Sets the receiver address for inflation rewards
  /// @param receiver The new inflation receiver address
  /// @dev Can only be called by accounts with ROLE_INFLATION_MANAGER
  /// @dev receiver cannot be the zero address
  function setInflationReceiver(address receiver) external;
}
