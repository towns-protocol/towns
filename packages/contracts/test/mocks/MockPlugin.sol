// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {IERC6900ExecutionModule} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {IERC6900Module} from "@erc6900/reference-implementation/interfaces/IERC6900Module.sol";

import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {ITownsApp} from "src/modules/interfaces/ITownsApp.sol";

// types
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";

// contracts

contract MockPlugin is ITownsApp {
    address public installedBy;
    bytes public initData;

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
        permissions[0] = keccak256("Read");
        return permissions;
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return
            interfaceId == type(IERC6900Module).interfaceId ||
            interfaceId == type(IERC6900ExecutionModule).interfaceId ||
            interfaceId == type(ITownsApp).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
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
}
