// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ExecutionManifest, IERC6900ExecutionModule, ManifestExecutionFunction, ManifestExecutionHook} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {IERC6900Module} from "@erc6900/reference-implementation/interfaces/IERC6900Module.sol";
import {ITownsApp} from "src/apps/ITownsApp.sol";
import {IERC173} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

// contracts
import {UUPSUpgradeable} from "solady/utils/UUPSUpgradeable.sol";
import {OwnableFacet} from "@towns-protocol/diamond/src/facets/ownable/OwnableFacet.sol";
import {EIP712Facet} from "@towns-protocol/diamond/src/utils/cryptography/EIP712Facet.sol";

contract MockModule is UUPSUpgradeable, OwnableFacet, EIP712Facet, ITownsApp {
    bytes4 private constant INVALID_SIGNATURE = 0xffffffff;

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
    bool public shouldFailUninstall;

    uint256 internal price;
    uint48 internal duration;

    function initialize(
        bool _shouldFailInstall,
        bool _shouldFailManifest,
        bool _shouldFailUninstall,
        uint256 _price
    ) external initializer {
        __Ownable_init_unchained(msg.sender);
        shouldFailInstall = _shouldFailInstall;
        shouldFailManifest = _shouldFailManifest;
        shouldFailUninstall = _shouldFailUninstall;
        price = _price;
    }

    function setShouldFailInstall(bool _shouldFail) external {
        shouldFailInstall = _shouldFail;
    }

    function setShouldFailUninstall(bool _shouldFail) external {
        shouldFailUninstall = _shouldFail;
    }

    function setPrice(uint256 _price) external {
        price = _price;
    }

    function setDuration(uint48 _duration) external {
        duration = _duration;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      MODULE METADATA                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function moduleId() external pure returns (string memory) {
        return "mock-module";
    }

    function moduleOwner() external view returns (address) {
        return _owner();
    }

    function installPrice() external view returns (uint256) {
        return price;
    }

    function accessDuration() external view returns (uint48) {
        return duration;
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

    function mockValidateSignature(
        bytes calldata signature,
        bytes32 structHash
    ) external view returns (bytes4) {
        bytes4 magicValue = _validateSignature(signature, structHash, msg.sender);
        if (magicValue == INVALID_SIGNATURE) {
            revert("Invalid signature");
        }
        return magicValue;
    }

    function _validateSignature(
        bytes calldata signature,
        bytes32 structHash,
        address owner
    ) internal view returns (bytes4) {
        // Try to extract the nested signature data (last 2 bytes should contain length)
        bool isNestedSignature;
        /// @solidity memory-safe-assembly
        assembly {
            // Check if signature has the nested format by looking at the last 2 bytes
            // which should contain the contentsDescription length
            if gt(signature.length, 0x42) {
                // 0x42 = minimum length for nested format
                let c := shr(240, calldataload(add(signature.offset, sub(signature.length, 2))))
                // Verify the signature has valid nested format
                isNestedSignature := and(gt(signature.length, add(0x42, c)), gt(c, 0))
            }
        }

        bytes32 hash;
        if (isNestedSignature) {
            // Use validator's domain for nested signatures
            bytes32 domainSeparator = EIP712Facet(owner).DOMAIN_SEPARATOR();
            hash = MessageHashUtils.toTypedDataHash(domainSeparator, structHash);
        } else {
            // Use app's domain for regular signatures
            hash = _hashTypedDataV4(structHash);
        }

        return IERC1271(owner).isValidSignature(hash, signature);
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
        if (shouldFailUninstall) {
            revert("Uninstallation failed");
        }
        emit OnUninstallCalled(msg.sender, data);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    INTERFACE FUNCTIONS                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function changeManifest() external {
        shouldFailManifest = !shouldFailManifest;
    }

    function executionManifest() external pure virtual returns (ExecutionManifest memory) {
        ManifestExecutionFunction[] memory executionFunctions = new ManifestExecutionFunction[](3);
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

        executionFunctions[2] = ManifestExecutionFunction({
            executionSelector: this.mockValidateSignature.selector,
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

    function _domainNameAndVersion() internal pure override returns (string memory, string memory) {
        return ("MockModule", "1");
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
