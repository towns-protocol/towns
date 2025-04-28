// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAccount} from "./interfaces/IAccount.sol";

// libraries
import {ModularAccountLib} from "./libraries/ModularAccountLib.sol";

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
        (result, ) = ModularAccountLib.execute(target, value, data);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       Module Management                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function installModule(
        bytes32 versionId,
        bytes calldata data,
        ModuleParams calldata params
    ) external onlyOwner {
        ModularAccountLib.installModule(
            versionId,
            params.grantDelay,
            params.executionDelay,
            params.allowance,
            data
        );
    }

    function uninstallModule(bytes32 versionId, bytes calldata data) external onlyOwner {
        ModularAccountLib.uninstallModule(versionId, data);
    }

    /// @notice Checks if a client is entitled to a permission for a module
    /// @param versionId The module ID to check
    /// @param publicKey The public key to check
    /// @param permission The permission to check
    /// @return True if the client is entitled to the permission, false otherwise
    function isModuleEntitled(
        bytes32 versionId,
        address publicKey,
        bytes32 permission
    ) external view returns (bool) {
        return ModularAccountLib.isEntitled(versionId, publicKey, permission);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Allowance                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function setModuleAllowance(bytes32 versionId, uint256 allowance) external onlyOwner {
        ModularAccountLib.setModuleAllowance(versionId, allowance);
    }

    function getModuleAllowance(bytes32 versionId) external view returns (uint256) {
        return ModularAccountLib.getModuleAllowance(versionId);
    }
}
