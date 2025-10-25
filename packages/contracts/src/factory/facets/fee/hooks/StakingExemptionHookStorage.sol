// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

/// @title StakingExemptionHookStorage
/// @notice Diamond storage for the StakingExemptionHook
library StakingExemptionHookStorage {
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
    function getLayout() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }
}
