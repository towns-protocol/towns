// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {ITownsApp} from "src/apps/ITownsApp.sol";
import {IERC173} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IModule} from "@erc6900/reference-implementation/interfaces/IModule.sol";

// types
import {ExecutionManifest, IExecutionModule} from "@erc6900/reference-implementation/interfaces/IExecutionModule.sol";

// contracts
import {OwnableFacet} from "@towns-protocol/diamond/src/facets/ownable/OwnableFacet.sol";

contract MockPlugin is OwnableFacet, ITownsApp {
    address public installedBy;
    bytes public initData;

    constructor(address owner) {
        __Ownable_init_unchained(owner);
    }

    function initialize(bytes calldata data) external override initializer {}

    function executionManifest()
        external
        pure
        override
        returns (ExecutionManifest memory manifest)
    {
        return manifest;
    }

    function requiredPermissions() external pure returns (bytes32[] memory) {
        bytes32[] memory permissions = new bytes32[](1);
        permissions[0] = bytes32("Read");
        return permissions;
    }

    function moduleOwner() external view returns (address) {
        return _owner();
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return
            interfaceId == type(IModule).interfaceId ||
            interfaceId == type(IExecutionModule).interfaceId ||
            interfaceId == type(ITownsApp).interfaceId ||
            interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IERC173).interfaceId;
    }

    function onInstall(bytes calldata data) external override {
        installedBy = msg.sender;
        initData = data;
    }

    function onUninstall(bytes calldata) external override {
        installedBy = address(0);
        initData = "";
    }

    function moduleId() external pure override returns (string memory) {
        return "mock.plugin.0.1";
    }

    function installPrice() external pure override returns (uint256) {
        return 0;
    }

    function accessDuration() external pure override returns (uint48) {
        return 0;
    }
}
