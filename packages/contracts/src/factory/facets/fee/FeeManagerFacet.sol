// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {IFeeManager} from "./IFeeManager.sol";
import {FeeManagerBase} from "./FeeManagerBase.sol";
import {FeeCalculationMethod, FeeConfig} from "./FeeManagerStorage.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";

/// @title FeeManagerFacet
/// @notice Facet for unified fee management across the protocol
contract FeeManagerFacet is
    IFeeManager,
    FeeManagerBase,
    OwnableBase,
    Facet,
    ReentrancyGuardTransient
{
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   INITIALIZATION                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function __FeeManagerFacet__init(address protocolRecipient) external onlyInitializing {
        _addInterface(type(IFeeManager).interfaceId);
        __FeeManagerFacet__init_unchained(protocolRecipient);
    }

    function __FeeManagerFacet__init_unchained(address protocolRecipient) internal {
        _setProtocolFeeRecipient(protocolRecipient);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       FEE OPERATIONS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IFeeManager
    function calculateFee(
        bytes32 feeType,
        address user,
        uint256 amount,
        bytes calldata extraData
    ) external view returns (uint256 finalFee) {
        return _calculateFee(feeType, user, amount, extraData);
    }

    /// @inheritdoc IFeeManager
    function chargeFee(
        bytes32 feeType,
        address user,
        uint256 amount,
        address currency,
        uint256 maxFee,
        bytes calldata extraData
    ) external payable nonReentrant returns (uint256 finalFee) {
        return _chargeFee(feeType, user, amount, currency, maxFee, extraData);
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
        uint128 fixedFee,
        bool enabled
    ) external onlyOwner {
        _setFeeConfig(feeType, recipient, method, bps, fixedFee, enabled);
    }

    /// @inheritdoc IFeeManager
    function setFeeHook(bytes32 feeType, address hook) external onlyOwner {
        _setFeeHook(feeType, hook);
    }

    /// @inheritdoc IFeeManager
    function setProtocolFeeRecipient(address recipient) external onlyOwner {
        _setProtocolFeeRecipient(recipient);
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
    function getProtocolFeeRecipient() external view returns (address recipient) {
        return _getProtocolFeeRecipient();
    }
}
