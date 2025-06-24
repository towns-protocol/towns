// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";
import {IAppAccount} from "../../../spaces/facets/account/IAppAccount.sol";
import {ITownsApp} from "../../ITownsApp.sol";

// libraries
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";

interface IAppRegistryBase {
    struct AppParams {
        string name;
        bytes32[] permissions;
        address client;
        uint256 installPrice;
        uint48 accessDuration;
    }

    struct App {
        bytes32 appId;
        address module;
        address owner;
        address client;
        bytes32[] permissions;
        ExecutionManifest manifest;
        uint48 duration;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    error AppAlreadyRegistered();
    error AppNotRegistered();
    error AppRevoked();
    error AppNotInstalled();
    error NotAppOwner();
    error AppDoesNotImplementInterface();
    error InvalidAppName();
    error InvalidAddressInput();
    error InvalidArrayInput();
    error BannedApp();
    error InvalidAppId();
    error InvalidPrice();
    error InvalidDuration();
    error InsufficientPayment();
    error NotAllowed();
    error ClientAlreadyRegistered();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    event AppRegistered(address indexed app, bytes32 uid);
    event AppUnregistered(address indexed app, bytes32 uid);
    event AppUpdated(address indexed app, bytes32 uid);
    event AppBanned(address indexed app, bytes32 uid);
    event AppSchemaSet(bytes32 uid);
    event AppCreated(address indexed app, bytes32 uid);
    event AppInstalled(address indexed app, address indexed account, bytes32 indexed appId);
    event AppUninstalled(address indexed app, address indexed account, bytes32 indexed appId);
    event AppRenewed(address indexed app, address indexed account, bytes32 indexed appId);
}

/// @title IAppRegistry Interface
/// @notice Interface for managing app registrations and permissions
interface IAppRegistry is IAppRegistryBase {
    /// @notice Get the schema structure used for registering apps
    /// @return The schema structure
    function getAppSchema() external view returns (string memory);

    /// @notice Get the active schema ID used for app attestations
    /// @return The schema ID
    function getAppSchemaId() external view returns (bytes32);

    /// @notice Get the attestation for a app
    /// @param appId The app ID
    /// @return The attestation
    function getAppById(bytes32 appId) external view returns (App memory);

    /// @notice Get the apps price
    /// @param app The app address
    /// @return The price
    function getAppPrice(address app) external view returns (uint256);

    /// @notice Get the duration of an app
    /// @param app The app address
    /// @return duration The duration of the app
    function getAppDuration(address app) external view returns (uint48);

    /// @notice Get the current version (attestation UID) for a app
    /// @param app The app address
    /// @return The attestation UID representing the current version
    function getLatestAppId(address app) external view returns (bytes32);

    /// @notice Get the app address associated with a client
    /// @param client The client address
    /// @return The app address
    function getAppByClient(address client) external view returns (address);

    /// @notice Check if a app is banned
    /// @param app The app address
    /// @return isBanned True if the app is banned, false otherwise
    function isAppBanned(address app) external view returns (bool);

    /// @notice Create a new app
    /// @param params The parameters of the app
    /// @return app The app address
    /// @return appId The attestation UID of the registered app
    function createApp(
        AppParams calldata params
    ) external payable returns (address app, bytes32 appId);

    /// @notice Register a new app with permissions
    /// @param app The app address to register
    /// @param client The client contract address that will use this app
    /// @return appId The attestation UID of the registered app
    function registerApp(ITownsApp app, address client) external payable returns (bytes32 appId);

    /// @notice Remove a app from the registry
    /// @param appId The app ID to remove
    function removeApp(bytes32 appId) external;

    /// @notice Renew an app
    /// @param app The app address to renew
    /// @param account The account to renew the app for
    /// @param data The data to pass to the app's onRenewApp function
    function renewApp(ITownsApp app, IAppAccount account, bytes calldata data) external payable;

    /// @notice Install an app
    /// @param app The app address to install
    /// @param account The account to install the app to
    /// @param data The data to pass to the app's onInstall function
    function installApp(ITownsApp app, IAppAccount account, bytes calldata data) external payable;

    /// @notice Uninstall an app
    /// @param app The app address to uninstall
    /// @param account The account to uninstall the app from
    /// @param data The data to pass to the app's onUninstall function
    function uninstallApp(ITownsApp app, IAppAccount account, bytes calldata data) external;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Admin                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    /// @notice Set the schema ID used for app registrations
    /// @param schema The new schema
    /// @return The schema ID
    function adminRegisterAppSchema(
        string calldata schema,
        ISchemaResolver resolver,
        bool revocable
    ) external returns (bytes32);

    /// @notice Ban a app from the registry
    /// @param app The app address to ban
    /// @return The attestation UID that was banned
    function adminBanApp(address app) external returns (bytes32);
}
