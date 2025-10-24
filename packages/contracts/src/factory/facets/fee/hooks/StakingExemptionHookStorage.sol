// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/// @title StakingExemptionHookStorage
/// @notice Diamond storage for the StakingExemptionHook
library StakingExemptionHookStorage {
    /// @dev Storage slot = keccak256(abi.encode(uint256(keccak256("factory.facets.fee.hooks.staking.exemption")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x7d7e8d9e8a9b9c9d9e8f8a8b8c8d8e8f8a8b8c8d8e8f8a8b8c8d8e8f8a8b8c00;

    struct Layout {
        /// @notice BaseRegistry contract that implements IRewardsDistribution
        address baseRegistry;
        /// @notice Minimum stake required for exemption by fee type
        mapping(bytes32 => uint256) exemptionThresholds;
    }

    /// @notice Returns the diamond storage layout
    function layout() internal pure returns (Layout storage ds) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            ds.slot := slot
        }
    }
}
