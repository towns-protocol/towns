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
        result = _onExecute(target, value, data);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       App Management                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IAppAccount
    function onInstallApp(bytes32 appId, bytes calldata data) external nonReentrant {
        _onlyRegistry();
        _installApp(appId, data);
    }

    /// @inheritdoc IAppAccount
    function onUninstallApp(bytes32 appId, bytes calldata data) external {
        _onlyRegistry();
        _uninstallApp(appId, data);
    }

    /// @inheritdoc IAppAccount
    function onRenewApp(bytes32 appId, bytes calldata data) external nonReentrant {
        _onlyRegistry();
        _onRenewApp(appId, data);
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
    function getInstalledApps() external view returns (address[] memory) {
        return _getApps();
    }

    /// @inheritdoc IAppAccount
    function isAppInstalled(address app) external view returns (bool) {
        return _isAppInstalled(app);
    }

    /// @inheritdoc IAppAccount
    function getAppId(address app) external view returns (bytes32) {
        return _getInstalledAppId(app);
    }

    /// @inheritdoc IAppAccount
    function getAppExpiration(address app) external view returns (uint48) {
        return _getGroupExpiration(_getInstalledAppId(app));
    }

    /// @inheritdoc IAppAccount
    function isAppEntitled(
        address app,
        address publicKey,
        bytes32 permission
    ) external view returns (bool) {
        return _isAppEntitled(app, publicKey, permission);
    }
}
