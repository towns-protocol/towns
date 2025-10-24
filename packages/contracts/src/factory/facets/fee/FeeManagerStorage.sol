// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/// @notice Fee calculation methods
enum FeeCalculationMethod {
    FIXED, // Flat fee amount
    PERCENT, // Percentage based on BPS
    HYBRID // Maximum of fixed fee or percentage
}

/// @notice Fee configuration for a specific fee type
/// @dev Packed into 2 storage slots for gas efficiency
/// @param recipient Address to receive the fee (slot 0)
/// @param lastUpdated Timestamp of last configuration update (slot 0)
/// @param bps Basis points (1-10000) for percentage calculations (slot 1)
/// @param method Fee calculation method (slot 1)
/// @param enabled Whether the fee is active (slot 1)
/// @param fixedFee Fixed amount in wei for FIXED or HYBRID methods (slot 1)
struct FeeConfig {
    address recipient; // 20 bytes
    uint48 lastUpdated; // 6 bytes
    uint16 bps; // 2 bytes
    FeeCalculationMethod method; // 1 byte
    bool enabled; // 1 byte
    uint160 fixedFee; // 20 bytes
}

/// @title FeeManagerStorage
/// @notice Diamond storage for the FeeManager facet
library FeeManagerStorage {
    /// @dev Storage slot = keccak256(abi.encode(uint256(keccak256("factory.facets.fee.manager")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xabafe0aee5292a745cc432476bbe9b496b2fe07074e3d7dcb579a3e420babf00;

    struct Layout {
        /// @notice Fee configurations by fee type
        mapping(bytes32 => FeeConfig) feeConfigs;
        /// @notice Fee hooks by fee type for dynamic fee adjustments
        mapping(bytes32 => address) feeHooks;
        /// @notice Global fallback fee recipient
        address globalFeeRecipient;
    }

    /// @notice Returns the diamond storage layout
    function layout() internal pure returns (Layout storage ds) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            ds.slot := slot
        }
    }
}
