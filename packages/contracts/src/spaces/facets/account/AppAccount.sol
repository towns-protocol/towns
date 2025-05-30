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
    /// @notice Validates if the target address is allowed for calls
    /// @dev Prevents calls to critical system contracts
    /// @param target The contract address to check
    modifier onlyAuthorized(address target) {
        _checkAuthorized(target);
        _;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      Execution                             */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external payable onlyAuthorized(target) nonReentrant returns (bytes memory result) {
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
    ) external onlyOwner {
        _installApp(app, params.delays, data);
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
    function isAppEntitled(
        address app,
        address publicKey,
        bytes32 permission
    ) external view returns (bool) {
        return _isEntitled(app, publicKey, permission);
    }
}
