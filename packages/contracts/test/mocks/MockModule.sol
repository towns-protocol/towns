// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ExecutionManifest, IERC6900ExecutionModule, ManifestExecutionFunction, ManifestExecutionHook} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {IERC6900Module} from "@erc6900/reference-implementation/interfaces/IERC6900Module.sol";
import {ITownsApp} from "src/modules/interfaces/ITownsApp.sol";
import {IERC173} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";

// contracts
import {UUPSUpgradeable} from "solady/utils/UUPSUpgradeable.sol";
import {OwnableFacet} from "@towns-protocol/diamond/src/facets/ownable/OwnableFacet.sol";

contract MockModule is UUPSUpgradeable, OwnableFacet, ITownsApp {
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
    bool public shouldFailManifest;

    function initialize(bool _shouldFailInstall, bool _shouldFailManifest) external initializer {
        __Ownable_init_unchained(msg.sender);
        shouldFailInstall = _shouldFailInstall;
        shouldFailManifest = _shouldFailManifest;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      MODULE METADATA                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
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
    function changeManifest() external {
        shouldFailManifest = !shouldFailManifest;
    }

    function executionManifest() external pure virtual returns (ExecutionManifest memory) {
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

        bytes4[] memory interfaceIds;

        return
            ExecutionManifest({
                executionFunctions: executionFunctions,
                executionHooks: executionHooks,
                interfaceIds: interfaceIds
            });
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == type(IERC6900ExecutionModule).interfaceId ||
            interfaceId == type(IERC6900Module).interfaceId ||
            interfaceId == type(ITownsApp).interfaceId ||
            interfaceId == type(IERC173).interfaceId;
    }

    function _authorizeUpgrade(address newImplementation) internal override {}
}

contract MockModuleV2 is MockModule {
    function executionManifest() external pure override returns (ExecutionManifest memory) {
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
            isPostHook: true
        });

        executionFunctions[1] = ManifestExecutionFunction({
            executionSelector: this.mockFunctionWithParams.selector,
            skipRuntimeValidation: false,
            allowGlobalValidation: true
        });

        bytes4[] memory interfaceIds;

        return
            ExecutionManifest({
                executionFunctions: executionFunctions,
                executionHooks: executionHooks,
                interfaceIds: interfaceIds
            });
    }
}
