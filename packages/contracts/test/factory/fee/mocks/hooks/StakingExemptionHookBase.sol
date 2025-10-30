// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {IRewardsDistribution} from "src/base/registry/facets/distribution/v2/IRewardsDistribution.sol";
import {FeeHookResult} from "src/factory/facets/fee/IFeeHook.sol";

/// @title StakingExemptionHookBase
/// @notice Base contract with internal logic for staking-based fee exemptions
abstract contract StakingExemptionHookBase {
    /// @dev Storage slot = keccak256(abi.encode(uint256(keccak256("factory.facets.fee.hooks.staking.exemption")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xee2fb2448ce4759f7d38c590fc4af13f2810b1a01f7049ddf7c524b63a467900;

    struct Layout {
        /// @notice BaseRegistry contract that implements IRewardsDistribution
        address baseRegistry;
        /// @notice Minimum stake required for exemption by fee type
        mapping(bytes32 => uint256) exemptionThresholds;
    }

    /// @notice Returns the diamond storage layout
    function _getLayout() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       CUSTOM ERRORS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    error StakingExemptionHook__InvalidRegistry();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    event BaseRegistrySet(address indexed baseRegistry);
    event ExemptionThresholdSet(bytes32 indexed feeType, uint256 threshold);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    INTERNAL CONFIGURATION                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Sets the base registry contract
    /// @param baseRegistry Address of BaseRegistry implementing IRewardsDistribution
    function _setBaseRegistry(address baseRegistry) internal {
        if (baseRegistry == address(0)) revert StakingExemptionHook__InvalidRegistry();
        if (baseRegistry.code.length == 0) revert StakingExemptionHook__InvalidRegistry();
        _getLayout().baseRegistry = baseRegistry;
        emit BaseRegistrySet(baseRegistry);
    }

    /// @notice Sets the exemption threshold for a fee type
    /// @param feeType The fee type identifier
    /// @param threshold Minimum stake required for exemption (in wei)
    function _setExemptionThreshold(bytes32 feeType, uint256 threshold) internal {
        _getLayout().exemptionThresholds[feeType] = threshold;
        emit ExemptionThresholdSet(feeType, threshold);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    INTERNAL FEE LOGIC                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Calculates fee based on staking exemption
    /// @param feeType The fee type identifier
    /// @param user The address to check for exemption
    /// @param baseFee The base fee amount
    /// @return result Fee calculation result
    function _calculateFee(
        bytes32 feeType,
        address user,
        uint256 baseFee,
        bytes calldata /* context */
    ) internal view returns (FeeHookResult memory result) {
        bool exempt = _isExempt(feeType, user);
        return FeeHookResult({finalFee: exempt ? 0 : baseFee, metadata: ""});
    }

    /// @notice Processes fee during charging (same as calculateFee for simple exemption)
    /// @dev For staking exemption, no state changes needed so forwards to _calculateFee
    /// @param feeType The fee type identifier
    /// @param user The address being charged
    /// @param baseFee The base fee amount
    /// @return result Fee calculation result
    function _onChargeFee(
        bytes32 feeType,
        address user,
        uint256 baseFee,
        bytes calldata context
    ) internal view returns (FeeHookResult memory result) {
        return _calculateFee(feeType, user, baseFee, context);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     INTERNAL HELPERS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Checks if a user is exempt from fees based on staked amount
    /// @param feeType The fee type identifier
    /// @param user The address to check
    /// @return exempt True if user has sufficient stake for exemption
    function _isExempt(bytes32 feeType, address user) internal view returns (bool exempt) {
        Layout storage $ = _getLayout();

        uint256 threshold = $.exemptionThresholds[feeType];
        if (threshold == 0) return false; // No threshold configured = no exemption

        address baseRegistry = $.baseRegistry;
        if (baseRegistry == address(0)) return false; // No registry configured = no exemption

        try IRewardsDistribution(baseRegistry).stakedByDepositor(user) returns (uint96 staked) {
            return staked >= threshold;
        } catch {
            return false; // Query failed = no exemption
        }
    }

    /// @notice Returns the base registry address
    /// @return baseRegistry The base registry address
    function _getBaseRegistry() internal view returns (address baseRegistry) {
        return _getLayout().baseRegistry;
    }

    /// @notice Returns the exemption threshold for a fee type
    /// @param feeType The fee type identifier
    /// @return threshold The exemption threshold
    function _getExemptionThreshold(bytes32 feeType) internal view returns (uint256 threshold) {
        return _getLayout().exemptionThresholds[feeType];
    }
}
