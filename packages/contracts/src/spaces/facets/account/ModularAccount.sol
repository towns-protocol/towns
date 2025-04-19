// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC6900Account, ValidationConfig, ModuleEntity} from "@erc6900/reference-implementation/interfaces/IERC6900Account.sol";
import {IAccount} from "./interfaces/IAccount.sol";
// libraries
import {ExecutorLib} from "./libraries/ExecutorLib.sol";
import {ModularAccountLib} from "./libraries/ModularAccountLib.sol";

// types
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {Call} from "@erc6900/reference-implementation/interfaces/IERC6900Account.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {TokenOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/token/TokenOwnableBase.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";

/**
 * @title ModularAccount
 * @notice A lightweight modular erc6900 semi-compatible account
 * @dev This account is used to execute transactions on behalf of a Space
 */
contract ModularAccount is IAccount, ReentrancyGuard, TokenOwnableBase, Facet {
    /**
     * @notice Validates if the target address is allowed for delegate calls
     * @dev Prevents delegate calls to critical system contracts
     * @param target The contract address to check
     */
    modifier onlyAuthorized(address target) {
        ModularAccountLib.checkAuthorized(target);
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
        (result, ) = ExecutorLib.execute(target, value, data);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       Module Management                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function installModule(
        bytes32 moduleId,
        bytes calldata data,
        ModuleParams calldata params
    ) external onlyOwner {
        ModularAccountLib.installModule(
            moduleId,
            params.grantDelay,
            params.executionDelay,
            params.allowance,
            data
        );
    }

    function uninstallModule(bytes32 moduleId, bytes calldata data) external onlyOwner {
        ModularAccountLib.uninstallModule(moduleId, data);
    }

    /// @notice Checks if a client is entitled to a permission for a module
    /// @param moduleId The module ID to check
    /// @param client The client to check
    /// @param permission The permission to check
    /// @return True if the client is entitled to the permission, false otherwise
    function isModuleEntitled(
        bytes32 moduleId,
        address client,
        bytes32 permission
    ) external view returns (bool) {
        return ModularAccountLib.isEntitled(moduleId, client, permission);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Allowance                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function setModuleAllowance(bytes32 moduleId, uint256 allowance) external onlyOwner {
        ModularAccountLib.setModuleAllowance(moduleId, allowance);
    }

    function getModuleAllowance(bytes32 moduleId) external view returns (uint256) {
        return ModularAccountLib.getModuleAllowance(moduleId);
    }
}
