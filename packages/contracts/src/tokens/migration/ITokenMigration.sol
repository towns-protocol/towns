// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// libraries

// contracts

interface ITokenMigrationBase {
    // Events
    event TokensMigrated(address indexed account, uint256 amount);
    event EmergencyWithdraw(address indexed token, address indexed to, uint256 amount);

    // Errors
    error TokenMigration__InvalidBalance();
    error TokenMigration__InvalidAllowance();
    error TokenMigration__NotEnoughTokenBalance();
    error TokenMigration__InvalidTokens();
}

interface ITokenMigration is ITokenMigrationBase {
    /// @notice Migrates tokens from old token to new token for the specified account
    /// @param account The address of the account to migrate tokens for
    /// @dev The account must have a non-zero balance of old tokens and have approved this contract
    function migrate(address account) external;

    /// @notice Allows the owner to withdraw tokens from the contract
    /// @dev Only callable by contract owner
    function emergencyWithdraw(IERC20 token, address to) external;

    /// @notice Returns the token pair
    function tokens() external view returns (IERC20 oldToken, IERC20 newToken);
}
