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

    struct Beacon {
        bytes32 beaconId;
        address beacon;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    event AppCreated(address indexed app, bytes32 indexed uid, address indexed owner);
    event BeaconAdded(bytes32 indexed beaconId, address indexed beacon);
    event BeaconRemoved(bytes32 indexed beaconId, address indexed beacon);
    event EntryPointSet(address indexed oldEntryPoint, address indexed newEntryPoint);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    error AppFactory__InvalidAppName();
    error AppFactory__InvalidArrayInput();
    error AppFactory__InvalidAddressInput();
    error AppFactory__BeaconNotFound();
    error AppFactory__InvalidBeaconId();
    error AppFactory__BeaconAlreadyExists();
}

interface IAppFactory is IAppFactoryBase {
    /// @notice Create a new app
    /// @param params The parameters of the app
    /// @return app The app address
    /// @return appId The attestation UID of the registered app
    function createApp(
        AppParams calldata params
    ) external payable returns (address app, bytes32 appId);

    /// @notice Create an app by beacon ID
    /// @param beaconId The ID of the beacon to use for app deployment
    /// @param params The parameters of the app
    /// @return app The app address
    /// @return appId The attestation UID of the registered app
    function createAppByBeacon(
        bytes32 beaconId,
        AppParams calldata params
    ) external payable returns (address app, bytes32 appId);

    /// @notice Add new beacon contracts for app deployment
    /// @param beacons Array of beacon contracts to add with their IDs
    function addBeacons(Beacon[] calldata beacons) external;

    /// @notice Remove existing beacon contracts
    /// @param beaconIds Array of beacon IDs to remove
    function removeBeacons(bytes32[] calldata beaconIds) external;

    /// @notice Set the entry point contract address for account abstraction
    /// @param entryPoint The address of the entry point contract
    function setEntryPoint(address entryPoint) external;

    /// @notice Get the beacon contract address for a given beacon ID
    /// @param beaconId The ID of the beacon to look up
    /// @return beacon The address of the beacon contract
    function getBeacon(bytes32 beaconId) external view returns (address beacon);

    /// @notice Get all registered beacon IDs
    /// @return beaconIds Array of all registered beacon IDs
    function getBeacons() external view returns (bytes32[] memory beaconIds);

    /// @notice Get the current entry point contract address
    /// @return entryPoint The address of the entry point contract
    function getEntryPoint() external view returns (address entryPoint);
}
