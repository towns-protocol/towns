// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";

// libraries
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";

// contracts

/**
 * @title IAppRegistryBase Interface
 * @notice Base interface for app registry functionality, defining errors and events
 * @dev Contains core errors and events used across the app registry system
 */
interface IAppRegistryBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /**
     * @dev Thrown when attempting to register an app that is already registered
     */
    error AppAlreadyRegistered();

    /**
     * @dev Thrown when referencing an app that is not registered
     */
    error AppNotRegistered();

    /**
     * @dev Thrown when attempting to use a revoked app
     */
    error AppRevoked();

    /**
     * @dev Thrown when an operation is performed by someone who is not the app owner
     */
    error NotAppOwner();

    /**
     * @dev Thrown when an app doesn't implement required interfaces
     */
    error AppDoesNotImplementInterface();

    /**
     * @dev Thrown when an invalid address (e.g., zero address) is provided
     */
    error InvalidAddressInput();

    /**
     * @dev Thrown when an invalid array (e.g., empty array) is provided
     */
    error InvalidArrayInput();

    /**
     * @dev Thrown when attempting to use a banned app
     */
    error BannedApp();

    /**
     * @dev Thrown when an invalid app ID is provided
     */
    error InvalidAppId();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /**
     * @dev Emitted when a new app is registered in the registry
     * @param app The address of the app
     * @param uid The attestation UID of the registered app
     */
    event AppRegistered(address indexed app, bytes32 uid);

    /**
     * @dev Emitted when an app is removed from the registry
     * @param app The address of the app
     * @param uid The attestation UID of the unregistered app
     */
    event AppUnregistered(address indexed app, bytes32 uid);

    /**
     * @dev Emitted when an app is updated in the registry
     * @param app The address of the app
     * @param uid The attestation UID of the updated app
     */
    event AppUpdated(address indexed app, bytes32 uid);

    /**
     * @dev Emitted when an app is banned from the registry
     * @param app The address of the app
     * @param uid The attestation UID of the banned app
     */
    event AppBanned(address indexed app, bytes32 uid);

    /**
     * @dev Emitted when the app schema is set or updated
     * @param uid The schema UID
     */
    event AppSchemaSet(bytes32 uid);
}

/**
 * @title IAppRegistry Interface
 * @notice Interface for managing app registrations and permissions
 * @dev Defines functions for registering, retrieving, and managing apps
 */
interface IAppRegistry is IAppRegistryBase {
    /**
     * @notice Get the schema structure used for registering apps
     * @dev Returns the string representation of the schema
     * @return The schema structure
     */
    function getAppSchema() external view returns (string memory);

    /**
     * @notice Get the active schema ID used for app attestations
     * @dev Returns the UID of the current schema used for app registrations
     * @return The schema ID
     */
    function getAppSchemaId() external view returns (bytes32);

    /**
     * @notice Get the attestation for an app
     * @dev Retrieves the attestation data for a specific app version
     * @param appId The app ID (attestation UID)
     * @return The attestation data
     */
    function getAppById(bytes32 appId) external view returns (Attestation memory);

    /**
     * @notice Get the current version (attestation UID) for an app
     * @dev Returns the latest attestation UID for the specified app address
     * @param app The app address
     * @return The attestation UID representing the current version
     */
    function getLatestAppId(address app) external view returns (bytes32);

    /**
     * @notice Check if an app is banned
     * @dev Returns the ban status of the specified app
     * @param app The app address
     * @return isBanned True if the app is banned, false otherwise
     */
    function isAppBanned(address app) external view returns (bool);

    /**
     * @notice Register a new app with permissions
     * @dev Creates a new attestation for the app with specified client addresses
     * @param app The app address to register
     * @param clients The list of client contract addresses that will use this app
     * @return appId The attestation UID of the registered app
     */
    function registerApp(
        address app,
        address[] calldata clients
    ) external payable returns (bytes32 appId);

    /**
     * @notice Remove an app from the registry
     * @dev Revokes the attestation for the specified app ID
     * @param appId The app ID to remove
     * @return The attestation UID that was removed
     */
    function removeApp(bytes32 appId) external returns (bytes32);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Admin                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /**
     * @notice Set the schema ID used for app registrations
     * @dev Creates a new schema with the specified parameters and sets it as the current schema
     * @param schema The new schema structure
     * @param resolver The resolver contract for the schema
     * @param revocable Whether attestations using this schema are revocable
     * @return The schema ID
     */
    function adminRegisterAppSchema(
        string calldata schema,
        ISchemaResolver resolver,
        bool revocable
    ) external returns (bytes32);

    /**
     * @notice Ban an app from the registry
     * @dev Marks an app as banned and revokes its current attestation
     * @param app The app address to ban
     * @return The attestation UID that was banned
     */
    function adminBanApp(address app) external returns (bytes32);
}
