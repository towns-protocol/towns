// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {StakingExemptionHookStorage} from "./StakingExemptionHookStorage.sol";
import {IRewardsDistribution} from "src/base/registry/facets/distribution/v2/IRewardsDistribution.sol";
import {FeeHookResult} from "../IFeeHook.sol";

/// @title StakingExemptionHookBase
/// @notice Base contract with internal logic for staking-based fee exemptions
abstract contract StakingExemptionHookBase {
    using StakingExemptionHookStorage for StakingExemptionHookStorage.Layout;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       CUSTOM ERRORS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    error StakingExemptionHook__InvalidRegistry();
    error StakingExemptionHook__InvalidThreshold();

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
        StakingExemptionHookStorage.Layout storage $ = StakingExemptionHookStorage.layout();
        $.baseRegistry = baseRegistry;
        emit BaseRegistrySet(baseRegistry);
    }

    /// @notice Sets the exemption threshold for a fee type
    /// @param feeType The fee type identifier
    /// @param threshold Minimum stake required for exemption (in wei)
    function _setExemptionThreshold(bytes32 feeType, uint256 threshold) internal {
        StakingExemptionHookStorage.Layout storage $ = StakingExemptionHookStorage.layout();
        $.exemptionThresholds[feeType] = threshold;
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

        return FeeHookResult({finalFee: exempt ? 0 : baseFee, shouldCharge: !exempt, metadata: ""});
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
        StakingExemptionHookStorage.Layout storage $ = StakingExemptionHookStorage.layout();

        uint256 threshold = $.exemptionThresholds[feeType];
        if (threshold == 0) {
            return false; // No threshold configured = no exemption
        }

        address baseRegistry = $.baseRegistry;
        if (baseRegistry == address(0)) {
            return false; // No registry configured = no exemption
        }

        try IRewardsDistribution(baseRegistry).stakedByDepositor(user) returns (uint96 staked) {
            return staked >= threshold;
        } catch {
            return false; // Query failed = no exemption
        }
    }

    /// @notice Returns the base registry address
    /// @return baseRegistry The base registry address
    function _getBaseRegistry() internal view returns (address baseRegistry) {
        return StakingExemptionHookStorage.layout().baseRegistry;
    }

    /// @notice Returns the exemption threshold for a fee type
    /// @param feeType The fee type identifier
    /// @return threshold The exemption threshold
    function _getExemptionThreshold(bytes32 feeType) internal view returns (uint256 threshold) {
        return StakingExemptionHookStorage.layout().exemptionThresholds[feeType];
    }
}
