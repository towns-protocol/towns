// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAppAccount} from "./IAppAccount.sol";

// libraries
import {AppAccountBase} from "./AppAccountBase.sol";

// contracts

import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";

/**
 * @title AppAccount
 * @notice A lightweight modular erc6900 semi-compatible account
 * @dev This account is used to execute transactions on behalf of a Space
 */
contract AppAccount is IAppAccount, AppAccountBase, ReentrancyGuard, Facet {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      Execution                             */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external payable nonReentrant returns (bytes memory result) {
        _checkAuthorized(target);
        (result, ) = _execute(target, value, data);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       App Management                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IAppAccount
    function installApp(
        address app,
        bytes calldata data,
        AppParams calldata params
    ) external payable nonReentrant onlyOwner {
        _installApp(app, params.delays, data);
    }

    /// @inheritdoc IAppAccount
    function enableApp(address app) external onlyOwner {
        _enableApp(app);
    }

    /// @inheritdoc IAppAccount
    function disableApp(address app) external onlyOwner {
        _disableApp(app);
    }

    /// @inheritdoc IAppAccount
    function uninstallApp(address app, bytes calldata data) external onlyOwner {
        _uninstallApp(app, data);
    }

    /// @inheritdoc IAppAccount
    function getInstalledApps() external view returns (address[] memory) {
        return _getApps();
    }

    /// @inheritdoc IAppAccount
    function getAppId(address app) external view returns (bytes32) {
        return _getAppId(app);
    }

    /// @inheritdoc IAppAccount
    function getAppClients(address app) external view returns (address[] memory) {
        return _getClients(app);
    }

    /// @inheritdoc IAppAccount
    function getAppPrice(address app) external view returns (uint256) {
        return _getTotalRequiredPayment(app);
    }

    /// @inheritdoc IAppAccount
    function isAppEntitled(
        address app,
        address publicKey,
        bytes32 permission
    ) external view returns (bool) {
        return _isEntitled(app, publicKey, permission);
    }
}
