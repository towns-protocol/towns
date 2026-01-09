// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

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
    /// @notice Receives ETH payments and forwards to payment handler
    /// @dev Virtual function allows inheriting contracts to customize payment handling
    receive() external payable virtual {
        _onPayment(msg.sender, msg.value);
    }

    /// @notice Required by IModule - called when module is installed
    /// @param postInstallData Additional data passed during installation
    function onInstall(bytes calldata postInstallData) external {
        _onInstall(postInstallData);
    }

    /// @notice Required by IModule - called when module is uninstalled
    /// @param postUninstallData Additional data passed during uninstallation
    function onUninstall(bytes calldata postUninstallData) external {
        _onUninstall(postUninstallData);
    }

    /// @inheritdoc ITownsApp
    function moduleOwner() external view returns (address) {
        return _moduleOwner();
    }

    /// @inheritdoc ITownsApp
    function installPrice() external view returns (uint256) {
        return _installPrice();
    }

    /// @inheritdoc ITownsApp
    function accessDuration() external view returns (uint48) {
        return _accessDuration();
    }

    /// @notice Checks if the contract supports a given interface
    /// @dev Implements ERC165 interface detection
    /// @param interfaceId The interface identifier to check
    /// @return true if the contract supports the interface, false otherwise
    function supportsInterface(bytes4 interfaceId) external view virtual returns (bool) {
        return
            interfaceId == type(ITownsApp).interfaceId ||
            interfaceId == type(IExecutionModule).interfaceId ||
            interfaceId == type(IModule).interfaceId;
    }

    /// @notice Internal hook called when ETH is received
    /// @dev Override in inheriting contracts to implement custom payment logic
    /// @param payer The address that sent the payment
    /// @param amount The amount of ETH received
    function _onPayment(address payer, uint256 amount) internal virtual {}

    /// @notice Internal hook called during module installation
    /// @dev Override in inheriting contracts to implement installation logic
    /// @param postInstallData Additional data passed during installation
    function _onInstall(bytes calldata postInstallData) internal virtual {}

    /// @notice Internal hook called during module uninstallation
    /// @dev Override in inheriting contracts to implement cleanup logic
    /// @param postUninstallData Additional data passed during uninstallation
    function _onUninstall(bytes calldata postUninstallData) internal virtual {}

    /// @notice Internal hook to get the module owner address
    /// @dev Override in inheriting contracts to return the actual owner
    /// @return The address of the module owner
    function _moduleOwner() internal view virtual returns (address) {}

    /// @notice Internal hook to get the install price
    /// @dev Override in inheriting contracts to return the actual price
    /// @return The price required to install the module
    function _installPrice() internal view virtual returns (uint256) {}

    /// @notice Internal hook to get the access duration
    /// @dev Override in inheriting contracts to return the actual duration
    /// @return The duration of access granted by the module
    function _accessDuration() internal view virtual returns (uint48) {}
}
