// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface ITokenMigrationBase {
  // Errors
  error TokenMigration__InvalidBalance();
  error TokenMigration__InvalidAllowance();
  // Events
  event TokensMigrated(address indexed account, uint256 amount);
}

interface ITokenMigration is ITokenMigrationBase {
  /// @notice Migrates tokens from old token to new token for the specified account
  /// @param account The address of the account to migrate tokens for
  /// @dev The account must have a non-zero balance of old tokens and have approved this contract
  function migrate(address account) external;

  /// @notice Allows the owner to withdraw any remaining old tokens from the contract
  /// @dev Only callable by contract owner
  function withdrawTokens() external;
}
