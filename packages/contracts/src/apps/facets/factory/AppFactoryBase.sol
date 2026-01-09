// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IAppFactoryBase} from "./IAppFactory.sol";
import {ITownsApp} from "../../ITownsApp.sol";

// libraries
import {LibClone} from "solady/utils/LibClone.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {AppFactoryStorage} from "./AppFactoryStorage.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {LibAppRegistry} from "../registry/LibAppRegistry.sol";

/// @title AppInstallerFacet
/// @author Towns Protocol
/// @notice Facet for installing apps to spaces
abstract contract AppFactoryBase is IAppFactoryBase {
    using CustomRevert for bytes4;
    using EnumerableSetLib for EnumerableSetLib.Bytes32Set;

    function _addBeacons(Beacon[] calldata beacons) internal {
        AppFactoryStorage.Layout storage $ = AppFactoryStorage.getLayout();
        uint256 length = beacons.length;
        for (uint256 i; i < length; ++i) {
            Beacon calldata beacon = beacons[i];
            if (beacon.beacon == address(0)) AppFactory__InvalidAddressInput.selector.revertWith();
            if (beacon.beaconId == bytes32(0)) AppFactory__InvalidBeaconId.selector.revertWith();
            if ($.beaconIds.contains(beacon.beaconId))
                AppFactory__BeaconAlreadyExists.selector.revertWith();
            $.beacons[beacon.beaconId] = beacon.beacon;
            $.beaconIds.add(beacon.beaconId);
            emit BeaconAdded(beacon.beaconId, beacon.beacon);
        }
    }

    function _removeBeacons(bytes32[] calldata beaconIds) internal {
        AppFactoryStorage.Layout storage $ = AppFactoryStorage.getLayout();
        uint256 length = beaconIds.length;
        for (uint256 i; i < length; ++i) {
            bytes32 beaconId = beaconIds[i];
            address beacon = $.beacons[beaconId];

            if (beaconId == bytes32(0)) AppFactory__InvalidBeaconId.selector.revertWith();
            if (beacon == address(0)) AppFactory__BeaconNotFound.selector.revertWith();

            delete $.beacons[beaconId];
            $.beaconIds.remove(beaconId);
            emit BeaconRemoved(beaconId, beacon);
        }
    }

    function _setEntryPoint(address entryPoint) internal {
        AppFactoryStorage.Layout storage $ = AppFactoryStorage.getLayout();
        address oldEntryPoint = $.entryPoint;
        $.entryPoint = entryPoint;
        emit EntryPointSet(oldEntryPoint, entryPoint);
    }

    /// @notice Create an upgradeable simple app contract
    /// @param params The parameters of the app
    function _createApp(
        bytes32 beaconId,
        AppParams calldata params
    ) internal returns (address app) {
        AppFactoryStorage.Layout storage $ = AppFactoryStorage.getLayout();

        address beacon = $.beacons[beaconId];
        if (beacon == address(0)) AppFactory__BeaconNotFound.selector.revertWith();

        uint48 accessDuration = LibAppRegistry.validateDuration(params.accessDuration);

        app = LibClone.deployERC1967BeaconProxy(beacon);
        ITownsApp(app).initialize(
            abi.encode(
                msg.sender,
                params.name,
                params.permissions,
                params.installPrice,
                accessDuration,
                params.client,
                $.entryPoint,
                address(this)
            )
        );
    }

    function _getBeacon(bytes32 beaconId) internal view returns (address beacon) {
        return AppFactoryStorage.getLayout().beacons[beaconId];
    }

    function _getBeacons() internal view returns (bytes32[] memory beaconIds) {
        return AppFactoryStorage.getLayout().beaconIds.values();
    }

    function _getDefaultBeaconId() internal view returns (bytes32 beaconId) {
        return AppFactoryStorage.getLayout().beaconIds.at(0);
    }

    function _validateParams(AppParams calldata params) internal pure {
        if (bytes(params.name).length == 0) AppFactory__InvalidAppName.selector.revertWith();
        if (params.permissions.length == 0) AppFactory__InvalidArrayInput.selector.revertWith();
        if (params.client == address(0)) AppFactory__InvalidAddressInput.selector.revertWith();
    }
}
