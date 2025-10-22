// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces

// libraries

// contracts

interface IAppFactoryBase {
    struct AppParams {
        string name;
        bytes32[] permissions;
        address client;
        uint256 installPrice;
        uint48 accessDuration;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    error AppFactory__InvalidAppName();
    error AppFactory__InvalidArrayInput();
    error AppFactory__InvalidAddressInput();

    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    event AppCreated(address indexed app, bytes32 indexed uid);
}

interface IAppFactory is IAppFactoryBase {
    /// @notice Create a new app
    /// @param params The parameters of the app
    /// @return app The app address
    /// @return appId The attestation UID of the registered app
    function createApp(
        AppParams calldata params
    ) external payable returns (address app, bytes32 appId);
}
