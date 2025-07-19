// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC6900ExecutionModule} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {IERC6900Module} from "@erc6900/reference-implementation/interfaces/IERC6900Module.sol";
import {ITownsApp} from "./ITownsApp.sol";

/// @title BaseApp
/// @notice Base contract for Towns apps implementing core ERC-6900 module functionality
/// @dev Provides base implementation for module installation/uninstallation and interface support
/// @dev Inheriting contracts should override _onInstall and _onUninstall as needed
/// @dev Implements IERC6900Module, IERC6900ExecutionModule, and ITownsApp interfaces

abstract contract BaseApp is ITownsApp {
    receive() external payable {
        _onPayment(msg.sender, msg.value);
    }

    // External functions
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == type(IERC6900ExecutionModule).interfaceId ||
            interfaceId == type(IERC6900Module).interfaceId ||
            interfaceId == type(ITownsApp).interfaceId;
    }

    /// @notice Required by IERC6900Module - called when module is installed
    function onInstall(bytes calldata postInstallData) external {
        _onInstall(postInstallData);
    }

    /// @notice Required by IERC6900Module - called when module is uninstalled
    function onUninstall(bytes calldata postUninstallData) external {
        _onUninstall(postUninstallData);
    }

    function moduleOwner() external view returns (address) {
        return _moduleOwner();
    }

    function installPrice() external view returns (uint256) {
        return _installPrice();
    }

    function accessDuration() external view returns (uint48) {
        return _accessDuration();
    }

    // Internal functions
    function _onInstall(bytes calldata postInstallData) internal virtual {}

    function _onUninstall(bytes calldata postUninstallData) internal virtual {}

    function _moduleOwner() internal view virtual returns (address) {}

    function _installPrice() internal view virtual returns (uint256) {}

    function _accessDuration() internal view virtual returns (uint48) {}

    function _onPayment(address payer, uint256 amount) internal virtual {}
}
