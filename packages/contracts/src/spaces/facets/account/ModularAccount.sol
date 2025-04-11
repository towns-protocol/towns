// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC6900Account, ValidationConfig, ModuleEntity} from "@erc6900/reference-implementation/interfaces/IERC6900Account.sol";

// libraries
import {ExecutorLib} from "./libraries/ExecutorLib.sol";
import {ModularAccountLib} from "./libraries/ModularAccountLib.sol";

// types
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {Call} from "@erc6900/reference-implementation/interfaces/IERC6900Account.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {TokenOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/token/TokenOwnableBase.sol";

/**
 * @title ModularAccount
 * @notice A lightweight modular erc6900 compatible account
 * @dev This account is used to execute transactions on behalf of a Space
 */
contract ModularAccount is IERC6900Account, TokenOwnableBase, Facet {
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
    ) external payable onlyAuthorized(target) returns (bytes memory result) {
        (result, ) = ExecutorLib.execute(target, value, data);
    }

    function executeBatch(Call[] calldata calls) external payable returns (bytes[] memory results) {
        for (uint256 i; i < calls.length; i++) {
            Call calldata call = calls[i];
            ModularAccountLib.checkAuthorized(call.target);
            (results[i], ) = ExecutorLib.execute(call.target, call.value, call.data);
        }
    }

    function executeWithRuntimeValidation(
        bytes calldata,
        bytes calldata
    ) external payable returns (bytes memory) {
        ModularAccountLib.noop();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       Module Management                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function installExecution(
        address module,
        ExecutionManifest calldata manifest,
        bytes calldata moduleInstallData
    ) external onlyOwner onlyAuthorized(module) {
        ModularAccountLib.installExecution(module, manifest, moduleInstallData);
    }

    function uninstallExecution(
        address module,
        ExecutionManifest calldata manifest,
        bytes calldata uninstallData
    ) external onlyOwner onlyAuthorized(module) {
        ModularAccountLib.uninstallExecution(module, manifest, uninstallData);
    }

    function installValidation(
        ValidationConfig,
        bytes4[] calldata,
        bytes calldata,
        bytes[] calldata
    ) external pure {
        ModularAccountLib.noop();
    }

    function uninstallValidation(ModuleEntity, bytes calldata, bytes[] calldata) external pure {
        ModularAccountLib.noop();
    }

    function accountId() external pure returns (string memory) {
        return "towns.modular.account";
    }
}
