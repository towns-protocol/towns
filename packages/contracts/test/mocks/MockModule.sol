// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ExecutionManifest, IERC6900ExecutionModule, ManifestExecutionFunction, ManifestExecutionHook} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {IERC6900Module} from "@erc6900/reference-implementation/interfaces/IERC6900Module.sol";
import {ITownsModule} from "src/attest/interfaces/ITownsModule.sol";

contract MockModule is ITownsModule {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    event MockFunctionCalled(address caller, uint256 value);
    event MockFunctionWithParamsCalled(address caller, uint256 value, string param);
    event OnInstallCalled(address caller, bytes data);
    event OnUninstallCalled(address caller, bytes data);
    event HookFunctionCalled(address caller, uint256 value);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           STATE                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    bool public shouldFailInstall;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         CONSTRUCTOR                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    constructor(bool _shouldFailInstall) {
        shouldFailInstall = _shouldFailInstall;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      MODULE METADATA                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function moduleName() external pure returns (string memory) {
        return "MockModule";
    }

    function moduleId() external pure returns (string memory) {
        return "mock-module";
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      PERMISSIONS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function requiredPermissions() external pure returns (bytes32[] memory) {
        bytes32[] memory permissions = new bytes32[](2);
        permissions[0] = keccak256("Read");
        permissions[1] = keccak256("Write");
        return permissions;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      MOCK FUNCTIONS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function mockFunction() external payable {
        emit MockFunctionCalled(msg.sender, msg.value);
    }

    function mockFunctionWithParams(string calldata param) external payable {
        emit MockFunctionWithParamsCalled(msg.sender, msg.value, param);
    }

    function preExecutionHook(
        uint32,
        address,
        uint256,
        bytes calldata
    ) external payable returns (bytes memory) {
        emit HookFunctionCalled(msg.sender, msg.value);
        return "";
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    LIFECYCLE FUNCTIONS                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function onInstall(bytes calldata data) external {
        if (shouldFailInstall) {
            revert("Installation failed");
        }
        emit OnInstallCalled(msg.sender, data);
    }

    function onUninstall(bytes calldata data) external {
        emit OnUninstallCalled(msg.sender, data);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    INTERFACE FUNCTIONS                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function executionManifest() external pure returns (ExecutionManifest memory) {
        ManifestExecutionFunction[] memory executionFunctions = new ManifestExecutionFunction[](2);
        ManifestExecutionHook[] memory executionHooks = new ManifestExecutionHook[](1);

        executionFunctions[0] = ManifestExecutionFunction({
            executionSelector: this.mockFunction.selector,
            skipRuntimeValidation: false,
            allowGlobalValidation: true
        });

        executionHooks[0] = ManifestExecutionHook({
            executionSelector: this.mockFunction.selector,
            entityId: 0,
            isPreHook: true,
            isPostHook: false
        });

        executionFunctions[1] = ManifestExecutionFunction({
            executionSelector: this.mockFunctionWithParams.selector,
            skipRuntimeValidation: false,
            allowGlobalValidation: true
        });

        bytes4[] memory interfaceIds = new bytes4[](0);

        return
            ExecutionManifest({
                executionFunctions: executionFunctions,
                executionHooks: executionHooks,
                interfaceIds: interfaceIds
            });
    }

    function isModuleType(bytes4 typeID) external pure returns (bool) {
        return typeID == type(IERC6900ExecutionModule).interfaceId;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == type(IERC6900ExecutionModule).interfaceId ||
            interfaceId == type(IERC6900Module).interfaceId ||
            interfaceId == type(ITownsModule).interfaceId;
    }
}
