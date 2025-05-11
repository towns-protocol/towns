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
    function installApp(
        bytes32 appId,
        bytes calldata data,
        AppParams calldata params
    ) external onlyOwner {
        _installApp(appId, params.grantDelay, params.executionDelay, params.allowance, data);
    }

    function uninstallApp(bytes32 appId, bytes calldata data) external onlyOwner {
        _uninstallApp(appId, data);
    }

    /// @notice Checks if a client is entitled to a permission for a module
    /// @param appId The module ID to check
    /// @param publicKey The public key to check
    /// @param permission The permission to check
    /// @return True if the client is entitled to the permission, false otherwise
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

    function setAppAllowance(bytes32 appId, uint256 allowance) external onlyOwner {
        _setAppAllowance(appId, allowance);
    }

    function getAppAllowance(bytes32 appId) external view returns (uint256) {
        return _getAppAllowance(appId);
    }
}
