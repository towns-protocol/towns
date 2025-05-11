// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC6900ExecutionModule} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {IERC6900Module} from "@erc6900/reference-implementation/interfaces/IERC6900Module.sol";
import {ITownsApp} from "../interfaces/ITownsApp.sol";

// libraries

// contracts

abstract contract BaseApp is ITownsApp {
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == type(IERC6900ExecutionModule).interfaceId ||
            interfaceId == type(IERC6900Module).interfaceId ||
            interfaceId == type(ITownsApp).interfaceId;
    }

    /**
     * @notice Required by IERC6900Module - called when module is installed
     */
    function onInstall(bytes calldata postInstallData) external {
        _onInstall(postInstallData);
    }

    /**
     * @notice Required by IERC6900Module - called when module is uninstalled
     */
    function onUninstall(bytes calldata postUninstallData) external {
        _onUninstall(postUninstallData);
    }

    function _onInstall(bytes calldata postInstallData) internal virtual {}

    function _onUninstall(bytes calldata postUninstallData) internal virtual {}
}
