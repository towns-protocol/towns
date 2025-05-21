// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
interface IAppAccountBase {
    /// @notice Params for installing an app
    /// @param delays The delays for installing an app
    /// @param allowances The token allowances for a module
    struct AppParams {
        Delays delays;
        Allowance[] allowances;
    }

    /// @notice Delays for installing an app
    /// @param grantDelay The delay before the app can be granted access to the group
    /// @param executionDelay The delay before the app can execute a transaction
    struct Delays {
        uint32 grantDelay;
        uint32 executionDelay;
    }

    /// @notice Allowance for a token
    /// @param token The token to set the allowance for
    /// @param allowance The maximum amount of the token that can be spent by the app
    struct Allowance {
        address token;
        uint256 allowance;
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
    error InvalidToken();
    error NotEnoughToken();
    error LargeAllowanceIncrease();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    event TokenAllowanceSet(
        bytes32 indexed groupId,
        address indexed token,
        uint256 allowance,
        uint256 timestamp
    );
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
