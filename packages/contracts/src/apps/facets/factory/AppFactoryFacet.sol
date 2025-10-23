// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IAppFactory} from "./IAppFactory.sol";
import {ITownsApp} from "../../ITownsApp.sol";

// libraries
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {AppFactoryStorage} from "./AppFactoryStorage.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {AppRegistryBase} from "../registry/AppRegistryBase.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";
import {AppFactoryBase} from "./AppFactoryBase.sol";

/// @title AppInstallerFacet
/// @author Towns Protocol
/// @notice Facet for installing apps to spaces
contract AppFactoryFacet is
    IAppFactory,
    AppRegistryBase,
    OwnableBase,
    ReentrancyGuardTransient,
    Facet,
    AppFactoryBase
{
    using CustomRevert for bytes4;

    function __AppFactory_init(Beacon[] calldata beacons) external onlyInitializing {
        _addBeacons(beacons);
        _addInterface(type(IAppFactory).interfaceId);
    }

    function createAppByBeacon(
        bytes32 beaconId,
        AppParams calldata params
    ) external payable nonReentrant returns (address app, bytes32 appId) {
        _validateParams(params);

        app = _createApp(beaconId, params);
        appId = _registerApp(ITownsApp(app), params.client);
        emit AppCreated(app, appId);
    }

    /// @notice Create an upgradeable simple app contract
    /// @param params The parameters of the app
    function createApp(
        AppParams calldata params
    ) external payable nonReentrant returns (address app, bytes32 appId) {
        _validateParams(params);

        bytes32 beaconId = _getDefaultBeaconId();
        app = _createApp(beaconId, params);
        appId = _registerApp(ITownsApp(app), params.client);
        emit AppCreated(app, appId);
    }

    function addBeacons(Beacon[] calldata beacons) external onlyOwner {
        _addBeacons(beacons);
    }

    function removeBeacons(bytes32[] calldata beaconIds) external onlyOwner {
        _removeBeacons(beaconIds);
    }

    function setEntryPoint(address entryPoint) external onlyOwner {
        AppFactoryStorage.Layout storage $ = AppFactoryStorage.getLayout();
        $.entryPoint = entryPoint;
    }

    function getBeacon(bytes32 beaconId) external view returns (address beacon) {
        return _getBeacon(beaconId);
    }

    function getBeacons() external view returns (bytes32[] memory beaconIds) {
        return _getBeacons();
    }

    function getEntryPoint() external view returns (address entryPoint) {
        entryPoint = AppFactoryStorage.getLayout().entryPoint;
    }
}
