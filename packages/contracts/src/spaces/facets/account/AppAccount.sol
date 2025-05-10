// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAppAccount} from "./IAppAccount.sol";

// libraries
import {AppAccountBase} from "./AppAccountBase.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {TokenOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/token/TokenOwnableBase.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";

/**
 * @title AppAccount
 * @notice A lightweight modular ERC6900 semi-compatible account
 * @dev This account is used to execute transactions on behalf of a Space and manages app interactions
 *      It implements the IAppAccount interface with access control and reentrancy protection
 */
contract AppAccount is IAppAccount, AppAccountBase, ReentrancyGuard, TokenOwnableBase, Facet {
    /**
     * @notice Validates if the target address is allowed for delegate calls
     * @dev Prevents delegate calls to critical system contracts
     * @param target The contract address to check
     */
    modifier onlyAuthorized(address target) {
        _checkAuthorized(target);
        _;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      Execution                             */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /**
     * @notice Execute a transaction on behalf of the account
     * @dev Only authorized targets are allowed and reentrancy is prevented
     * @param target The address of the contract to call
     * @param value The amount of ETH to send with the call
     * @param data The calldata to send
     * @return result The result of the call
     */
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

    /**
     * @notice Install an app in the account
     * @dev Only the owner can install apps
     * @param appId The unique identifier of the app to install
     * @param data Additional data to pass to the app's onInstall function
     * @param params Configuration parameters for the app installation
     */
    function installApp(
        bytes32 appId,
        bytes calldata data,
        AppParams calldata params
    ) external onlyOwner {
        _installApp(appId, params.grantDelay, params.executionDelay, params.allowance, data);
    }

    /**
     * @notice Uninstall an app from the account
     * @dev Only the owner can uninstall apps
     * @param appId The unique identifier of the app to uninstall
     * @param data Additional data to pass to the app's onUninstall function
     */
    function uninstallApp(bytes32 appId, bytes calldata data) external onlyOwner {
        _uninstallApp(appId, data);
    }

    /**
     * @notice Check if a client is entitled to a specific permission for an app
     * @dev Verifies if the client has the specified permission for the given app
     * @param appId The unique identifier of the app
     * @param publicKey The address of the client to check
     * @param permission The permission to check for
     * @return True if the client has the permission, false otherwise
     */
    function isAppEntitled(
        bytes32 appId,
        address publicKey,
        bytes32 permission
    ) external view returns (bool) {
        return _isEntitled(appId, publicKey, permission);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Allowance                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /**
     * @notice Set the maximum amount of ETH that an app can spend
     * @dev Only the owner can set allowances
     * @param appId The unique identifier of the app
     * @param allowance The new allowance value
     */
    function setAppAllowance(bytes32 appId, uint256 allowance) external onlyOwner {
        _setAppAllowance(appId, allowance);
    }

    /**
     * @notice Get the current ETH allowance for an app
     * @dev Returns the maximum amount of ETH the app can spend
     * @param appId The unique identifier of the app
     * @return The current allowance value
     */
    function getAppAllowance(bytes32 appId) external view returns (uint256) {
        return _getAppAllowance(appId);
    }
}
