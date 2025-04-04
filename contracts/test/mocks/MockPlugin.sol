// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {IERC6900Module} from "contracts/src/app/interfaces/IERC6900Module.sol";

// libraries

// contracts

contract MockPlugin is IERC6900Module {
    address public installedBy;
    bytes public initData;

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IERC6900Module).interfaceId
            || interfaceId == type(IERC165).interfaceId;
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
