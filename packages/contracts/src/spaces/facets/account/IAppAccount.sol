// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
interface IAppAccountBase {
    /// @notice Params for installing an app
    /// @param allowance The maximum amount of ETH that can be spent by the app
    /// @param grantDelay The delay before the app can be granted access to the group
    /// @param executionDelay The delay before the app can execute a transaction
    struct AppParams {
        uint256 allowance;
        uint32 grantDelay;
        uint32 executionDelay;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    error UnauthorizedApp(address app);
    error InvalidAppAddress(address app);
    error InvalidManifest(address app);
    error UnauthorizedSelector();
    error NotEnoughEth();
    error AppAlreadyInstalled();
    error InvalidAppId();
    error AppNotInstalled();
    error AppNotRegistered();
    error AppRevoked();
}

interface IAppAccount is IAppAccountBase {
    function installApp(bytes32 appId, bytes calldata data, AppParams calldata params) external;

    function uninstallApp(bytes32 appId, bytes calldata data) external;

    function isAppEntitled(
        bytes32 appId,
        address publicKey,
        bytes32 permission
    ) external view returns (bool);

    function setAppAllowance(bytes32 appId, uint256 allowance) external;

    function getAppAllowance(bytes32 appId) external view returns (uint256);
}
