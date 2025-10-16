// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {ExecutionManifest, ManifestExecutionFunction, ManifestExecutionHook} from "@erc6900/reference-implementation/interfaces/IExecutionModule.sol";
import {IExecutionModule} from "@erc6900/reference-implementation/interfaces/IExecutionModule.sol";
import {IModule} from "@erc6900/reference-implementation/interfaces/IModule.sol";
import {ITownsApp} from "src/apps/ITownsApp.sol";
// libraries

// contracts
import {OwnableFacet} from "@towns-protocol/diamond/src/facets/ownable/OwnableFacet.sol";

contract MockInvalidModule is OwnableFacet, ITownsApp {
    constructor() {
        __Ownable_init_unchained(msg.sender);
    }

    function initialize(
        address owner,
        string calldata,
        bytes32[] calldata,
        uint256,
        uint48,
        address,
        bytes calldata
    ) external {
        __Ownable_init_unchained(owner);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      MODULE METADATA                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function moduleId() external pure returns (string memory) {
        return "invalid-module";
    }

    function moduleOwner() external view returns (address) {
        return _owner();
    }

    function installPrice() external pure returns (uint256) {
        return 0;
    }

    function accessDuration() external pure returns (uint48) {
        return 0;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      PERMISSIONS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function requiredPermissions() external pure returns (bytes32[] memory) {
        bytes32[] memory permissions = new bytes32[](1);
        permissions[0] = keccak256("Read");
        return permissions;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      MOCK FUNCTIONS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function diamondCut(
        IDiamond.FacetCut[] calldata facetCuts,
        address init,
        bytes calldata initPayload
    ) external {}

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    LIFECYCLE FUNCTIONS                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function onInstall(bytes calldata data) external {}

    function onUninstall(bytes calldata data) external {}

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    INTERFACE FUNCTIONS                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function executionManifest() external pure returns (ExecutionManifest memory) {
        ManifestExecutionFunction[] memory executionFunctions = new ManifestExecutionFunction[](1);
        ManifestExecutionHook[] memory executionHooks = new ManifestExecutionHook[](0);

        executionFunctions[0] = ManifestExecutionFunction({
            executionSelector: this.diamondCut.selector,
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
            interfaceId == type(IExecutionModule).interfaceId ||
            interfaceId == type(IModule).interfaceId ||
            interfaceId == type(ITownsApp).interfaceId;
    }
}
