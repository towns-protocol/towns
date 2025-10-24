// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IFeeManager} from "./IFeeManager.sol";
import {FeeManagerBase} from "./FeeManagerBase.sol";
import {FeeCalculationMethod, FeeConfig} from "./FeeManagerStorage.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

/// @title FeeManagerFacet
/// @notice Facet for unified fee management across the protocol
/// @dev Implements the Diamond pattern for upgradeability
contract FeeManagerFacet is IFeeManager, FeeManagerBase, OwnableBase, Facet {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   INITIALIZATION                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IFeeManager
    function initFeeManager(address globalFeeRecipient) external onlyInitializing {
        _setGlobalFeeRecipient(globalFeeRecipient);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       FEE OPERATIONS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IFeeManager
    function calculateFee(
        bytes32 feeType,
        address user,
        uint256 amount,
        bytes calldata context
    ) external view returns (uint256 finalFee) {
        return _calculateFee(feeType, user, amount, context);
    }

    /// @inheritdoc IFeeManager
    function chargeFee(
        bytes32 feeType,
        address user,
        uint256 amount,
        address currency,
        bytes calldata context
    ) external payable returns (uint256 finalFee) {
        return _chargeFee(feeType, user, amount, currency, context);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   CONFIGURATION (OWNER)                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IFeeManager
    function setFeeConfig(
        bytes32 feeType,
        address recipient,
        FeeCalculationMethod method,
        uint16 bps,
        uint160 fixedFee,
        bool enabled
    ) external onlyOwner {
        _setFeeConfig(feeType, recipient, method, bps, fixedFee, enabled);
    }

    /// @inheritdoc IFeeManager
    function setFeeHook(bytes32 feeType, address hook) external onlyOwner {
        _setFeeHook(feeType, hook);
    }

    /// @inheritdoc IFeeManager
    function setGlobalFeeRecipient(address recipient) external onlyOwner {
        _setGlobalFeeRecipient(recipient);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          GETTERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IFeeManager
    function getFeeConfig(bytes32 feeType) external view returns (FeeConfig memory config) {
        return _getFeeConfig(feeType);
    }

    /// @inheritdoc IFeeManager
    function getFeeHook(bytes32 feeType) external view returns (address hook) {
        return _getFeeHook(feeType);
    }

    /// @inheritdoc IFeeManager
    function getGlobalFeeRecipient() external view returns (address recipient) {
        return _getGlobalFeeRecipient();
    }
}
