// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {
    ExecutionManifest,
    IERC6900ExecutionModule,
    ManifestExecutionFunction,
    ManifestExecutionHook
} from "@erc6900/reference-implementation/src/interfaces/IERC6900ExecutionModule.sol";
import {IERC6900Module} from "@erc6900/reference-implementation/src/interfaces/IERC6900Module.sol";

contract MockModule is IERC6900ExecutionModule {
    struct RequiredPermission {
        bytes32 permission;
        string description;
    }

    // Events to track function calls
    event MockFunctionCalled(address caller, uint256 value);
    event MockFunctionWithParamsCalled(address caller, uint256 value, string param);
    event OnInstallCalled(address caller, bytes data);
    event OnUninstallCalled(address caller, bytes data);
    event HookFunctionCalled(address caller, uint256 value);
    // State to control installation behavior

    bool public shouldFailInstall;

    constructor(bool _shouldFailInstall) {
        shouldFailInstall = _shouldFailInstall;
    }

    // Test functions that will be registered
    function mockFunction() external payable {
        emit MockFunctionCalled(msg.sender, msg.value);
    }

    function mockFunctionWithParams(string calldata param) external payable {
        emit MockFunctionWithParamsCalled(msg.sender, msg.value, param);
    }

    // Module declares what permissions it needs
    function getRequiredPermissions() public pure returns (RequiredPermission[] memory) {
        RequiredPermission[] memory required = new RequiredPermission[](2);

        required[0] = RequiredPermission({
            permission: keccak256("Read"),
            description: "Required to read messages in channels"
        });

        required[1] = RequiredPermission({
            permission: keccak256("Write"),
            description: "Required to send messages"
        });

        return required;
    }

    // Update the hook function to match the expected signature
    function preExecutionHook(
        uint32,
        address,
        uint256,
        bytes calldata
    )
        external
        payable
        returns (bytes memory)
    {
        emit HookFunctionCalled(msg.sender, msg.value);
        return ""; // or return some data for post-hook
    }

    // Implementation of IERC6900ExecutionModule
    function executionManifest() external pure returns (ExecutionManifest memory) {
        // Create array for execution functions
        ManifestExecutionFunction[] memory executionFunctions = new ManifestExecutionFunction[](2);
        // Create array for hooks (empty for this mock)
        ManifestExecutionHook[] memory executionHooks = new ManifestExecutionHook[](1);

        // Register mockFunction
        executionFunctions[0] = ManifestExecutionFunction({
            executionSelector: this.mockFunction.selector,
            skipRuntimeValidation: false,
            allowGlobalValidation: true
        });

        // Register hook for mockFunction
        executionHooks[0] = ManifestExecutionHook({
            executionSelector: this.mockFunction.selector,
            entityId: 0,
            isPreHook: true,
            isPostHook: false
        });

        // Second function
        executionFunctions[1] = ManifestExecutionFunction({
            executionSelector: this.mockFunctionWithParams.selector,
            skipRuntimeValidation: false,
            allowGlobalValidation: true
        });

        // Create array for interface IDs (empty for this mock)
        bytes4[] memory interfaceIds = new bytes4[](0);

        return ExecutionManifest({
            executionFunctions: executionFunctions,
            executionHooks: executionHooks,
            interfaceIds: interfaceIds
        });
    }

    // Optional: Implement onInstall to test installation callback
    function onInstall(bytes calldata data) external {
        if (shouldFailInstall) {
            revert("Installation failed");
        }
        emit OnInstallCalled(msg.sender, data);
    }

    function onUninstall(bytes calldata data) external {
        emit OnUninstallCalled(msg.sender, data);
    }

    // Required by IERC6900Module
    function isModuleType(bytes4 typeID) external pure returns (bool) {
        return typeID == type(IERC6900ExecutionModule).interfaceId;
    }

    // Required by IERC165
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IERC6900ExecutionModule).interfaceId
            || interfaceId == type(IERC6900Module).interfaceId;
    }

    function moduleId() external pure returns (string memory) {
        return "mock-module";
    }
}
