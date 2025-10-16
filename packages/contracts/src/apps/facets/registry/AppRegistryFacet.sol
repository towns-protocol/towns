// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAppRegistry} from "./IAppRegistry.sol";
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";
import {IAppAccount} from "../../../spaces/facets/account/IAppAccount.sol";
import {ITownsApp} from "../../ITownsApp.sol";

// storage
import {AppRegistryStorage} from "./AppRegistryStorage.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";

// types
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";

// contracts
import {AppRegistryBase} from "./AppRegistryBase.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";

contract AppRegistryFacet is IAppRegistry, AppRegistryBase, OwnableBase, ReentrancyGuard, Facet {
    using EnumerableSetLib for EnumerableSetLib.Bytes32Set;

    function __AppRegistry_init(
        address spaceFactory,
        string calldata schema,
        ISchemaResolver resolver
    ) external onlyInitializing {
        __AppRegistry_init_unchained(spaceFactory, schema, resolver);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        DAO functions                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Set the schema ID used for app attestations
    /// @param schema The new schema
    function adminRegisterAppSchema(
        string calldata schema,
        ISchemaResolver resolver,
        bool revocable
    ) external onlyOwner returns (bytes32 schemaId) {
        schemaId = _registerSchema(schema, resolver, revocable);
        _setSchemaId(schemaId);
    }

    /// @notice Ban a app from the registry
    /// @param app The app address to ban
    /// @dev Only the owner can ban a app
    /// @return The attestation UID that was banned
    function adminBanApp(address app) external onlyOwner returns (bytes32) {
        return _banApp(app);
    }

    /// @notice Register a new app type with its beacon
    /// @param appType The type identifier (e.g. keccak256("simple"), keccak256("flexible"))
    /// @param beacon The beacon contract address for this app type
    function adminRegisterAppType(bytes32 appType, address beacon) external onlyOwner {
        _registerAppType(appType, beacon);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           App Functions                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Create a new app
    /// @param params The parameters of the app
    function createApp(
        AppParams calldata params
    ) external payable nonReentrant returns (address app, bytes32 appId) {
        return _createApp(keccak256("simple"), params);
    }

    /// @notice Create an upgradeable app contract
    /// @param appType The type identifier (e.g. keccak256("simple"), keccak256("flexible"))
    /// @param params The parameters of the app
    function createAppByType(
        bytes32 appType,
        AppParams calldata params
    ) external payable nonReentrant returns (address app, bytes32 appId) {
        return _createApp(appType, params);
    }

    /// @notice Register a new app with permissions
    /// @param app The app address to register
    /// @param client The client address that will make calls from this app
    /// @return appId The app ID of the registered app
    function registerApp(
        ITownsApp app,
        address client
    ) external payable nonReentrant returns (bytes32) {
        return _registerApp(app, client);
    }

    /// @notice Upgrade an app
    /// @param app The app address to update
    /// @param client The client address part of the app's identity
    /// @param appId The app ID to upgrade
    /// @return appId The new app ID of the updated app
    function upgradeApp(
        ITownsApp app,
        address client,
        bytes32 appId
    ) external payable nonReentrant returns (bytes32) {
        return _upgradeApp(app, client, appId);
    }

    /// @notice Remove an app from the registry
    /// @param appId The app ID to remove
    /// @dev Only the owner of the app can remove it
    function removeApp(bytes32 appId) external nonReentrant {
        _removeApp(appId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        Space Functions                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Install an app
    /// @param app The app address to install
    /// @param space The space to install the app to
    /// @param data The data to pass to the app's onInstall function
    function installApp(
        ITownsApp app,
        IAppAccount space,
        bytes calldata data
    ) external payable nonReentrant {
        _onlyAllowed(address(space));
        return _installApp(address(app), address(space), data);
    }

    /// @notice Uninstall an app
    /// @param app The app address to uninstall
    /// @param space The space to uninstall the app from
    /// @param data The data to pass to the app's onUninstall function
    function uninstallApp(
        ITownsApp app,
        IAppAccount space,
        bytes calldata data
    ) external nonReentrant {
        _onlyAllowed(address(space));
        _uninstallApp(address(app), address(space), data);
    }

    /// @notice Update an app to the latest version
    /// @param app The app address to update
    /// @param space The space to update the app to
    function updateApp(ITownsApp app, IAppAccount space) external nonReentrant {
        _onlyAllowed(address(space));
        _updateApp(address(app), address(space));
    }

    /// @notice Renew an app
    /// @param app The app address to renew
    /// @param account The account to renew the app for
    /// @param data The data to pass to the app's onRenewApp function
    function renewApp(
        ITownsApp app,
        IAppAccount account,
        bytes calldata data
    ) external payable nonReentrant {
        _onlyAllowed(address(account));
        _renewApp(address(app), address(account), data);
    }

    /// @notice Get the schema structure used for registering modules
    /// @return The schema structure
    function getAppSchema() external view returns (string memory) {
        return _getSchema(_getSchemaId()).schema;
    }

    /// @notice Get the active schema ID used for app attestations
    /// @return The schema ID
    function getAppSchemaId() external view returns (bytes32) {
        return _getSchemaId();
    }

    /// @notice Get the app by ID
    /// @param appId The app ID
    /// @return app The app
    function getAppById(bytes32 appId) external view returns (App memory app) {
        return _getAppById(appId);
    }

    /// @notice Get the total price of an app
    /// @param app The app address
    /// @return price The price of the app with protocol fee
    function getAppPrice(address app) external view returns (uint256 price) {
        return _getAppPrice(app);
    }

    /// @notice Get the duration of an app
    /// @param app The app address
    /// @return duration The duration of the app
    function getAppDuration(address app) external view returns (uint48 duration) {
        return _getAppDuration(app);
    }

    /// @notice Get the latest version ID for a app
    /// @param app The app address
    /// @return appId The version ID of the registered app
    function getLatestAppId(address app) external view returns (bytes32) {
        return _getLatestAppId(app);
    }

    /// @notice Get the app address associated with a client
    /// @param client The client address
    /// @return app The app address
    function getAppByClient(address client) external view returns (address app) {
        return _getAppByClient(client);
    }

    /// @notice Check if a app is banned
    /// @param app The app address
    /// @return isBanned True if the app is banned, false otherwise
    function isAppBanned(address app) external view returns (bool) {
        return _isBanned(app);
    }

    /// @notice Get the registered app types
    /// @return appTypes The registered app types
    function getRegisteredAppTypes() external view returns (bytes32[] memory appTypes) {
        return AppRegistryStorage.getLayout().registeredAppTypes.values();
    }

    /// @notice Get the app beacon for a app type
    /// @param appType The app type
    /// @return beacon The app beacon
    function getAppBeacon(bytes32 appType) external view returns (address beacon) {
        return AppRegistryStorage.getLayout().appBeacons[appType];
    }
}
