// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IAppFactory} from "./IAppFactory.sol";
import {ISimpleApp} from "../../helpers/ISimpleApp.sol";
import {ITownsApp} from "../../ITownsApp.sol";

// libraries
import {LibClone} from "solady/utils/LibClone.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {AppRegistryBase} from "../registry/AppRegistryBase.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";

/// @title AppInstallerFacet
/// @author Towns Protocol
/// @notice Facet for installing apps to spaces
contract AppFactoryFacet is IAppFactory, AppRegistryBase, ReentrancyGuardTransient, Facet {
    using CustomRevert for bytes4;

    function __AppFactory_init() external onlyInitializing {
        _addInterface(type(IAppFactory).interfaceId);
    }

    /// @notice Create an upgradeable simple app contract
    /// @param params The parameters of the app
    function createApp(
        AppParams calldata params
    ) external payable nonReentrant returns (address app, bytes32 appId) {
        if (bytes(params.name).length == 0) AppFactory__InvalidAppName.selector.revertWith();
        if (params.permissions.length == 0) AppFactory__InvalidArrayInput.selector.revertWith();
        if (params.client == address(0)) AppFactory__InvalidAddressInput.selector.revertWith();

        uint48 duration = _validateDuration(params.accessDuration);

        app = LibClone.deployERC1967BeaconProxy(address(this));
        ISimpleApp(app).initialize(
            msg.sender,
            params.name,
            params.permissions,
            params.installPrice,
            duration,
            params.client
        );

        appId = _registerApp(ITownsApp(app), params.client);
        emit AppCreated(app, appId);
    }
}
