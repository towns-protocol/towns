// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

interface IAccountHub {
    /// @notice Sets the space factory
    /// @param spaceFactory The address of the space factory
    function setSpaceFactory(address spaceFactory) external;

    /// @notice Sets the app registry
    /// @param appRegistry The address of the app registry
    function setAppRegistry(address appRegistry) external;

    /// @notice Gets the space factory
    /// @return The address of the space factory
    function getSpaceFactory() external view returns (address);

    /// @notice Gets the app registry
    /// @return The address of the app registry
    function getAppRegistry() external view returns (address);

    /// @notice Checks if an account is installed
    /// @param account The address of the account
    /// @return True if the account is installed, false otherwise
    function isInstalled(address account) external view returns (bool);
}
