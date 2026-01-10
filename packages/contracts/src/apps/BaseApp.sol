// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IExecutionModule} from "@erc6900/reference-implementation/interfaces/IExecutionModule.sol";
import {IModule} from "@erc6900/reference-implementation/interfaces/IModule.sol";
import {ITownsApp} from "./ITownsApp.sol";

/// @title BaseApp
/// @notice Base contract for Towns apps implementing core ERC-6900 module functionality
/// @dev Provides base implementation for module installation/uninstallation and interface support
/// @dev Inheriting contracts should override _onInstall and _onUninstall as needed
/// @dev Implements IModule, IExecutionModule, and ITownsApp interfaces
abstract contract BaseApp is ITownsApp {
    receive() external payable virtual {
        _onPayment(msg.sender, msg.value);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    Base App Functions                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Required by IModule - called when module is installed
    function onInstall(bytes calldata postInstallData) external {
        _onInstall(postInstallData);
    }

    /// @notice Required by IModule - called when module is uninstalled
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

    function supportsInterface(bytes4 interfaceId) public view virtual returns (bool) {
        return
            interfaceId == type(ITownsApp).interfaceId ||
            interfaceId == type(IExecutionModule).interfaceId ||
            interfaceId == type(IModule).interfaceId;
    }

    // Hooks
    function _onInstall(bytes calldata postInstallData) internal virtual {}

    function _onUninstall(bytes calldata postUninstallData) internal virtual {}

    function _onPayment(address payer, uint256 amount) internal virtual {}

    function _moduleOwner() internal view virtual returns (address) {}

    function _installPrice() internal view virtual returns (uint256) {}

    function _accessDuration() internal view virtual returns (uint48) {}
}
