// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

/// @notice Fee calculation methods
enum FeeCalculationMethod {
    FIXED, // Flat fee amount
    PERCENT, // Percentage based on BPS
    HYBRID // Maximum of fixed fee or percentage
}

/// @notice Fee configuration for a specific fee type
/// @param recipient Address to receive the fee
/// @param lastUpdated Timestamp of last configuration update
/// @param bps Basis points (1-10000) for percentage calculations
/// @param method Fee calculation method
/// @param enabled Whether the fee is active
/// @param fixedFee Fixed amount in wei for FIXED or HYBRID methods
struct FeeConfig {
    address recipient; // 20 bytes
    uint48 lastUpdated; // 6 bytes
    uint16 bps; // 2 bytes
    FeeCalculationMethod method; // 1 byte
    bool enabled; // 1 byte
    uint128 fixedFee; // 16 bytes
    address hook; // 20 bytes
}

/// @title FeeManagerStorage
/// @notice Diamond storage for the FeeManager facet
library FeeManagerStorage {
    struct Layout {
        /// @notice Fee configurations by fee type
        mapping(bytes32 => FeeConfig) feeConfigs;
        /// @notice Protocol fee recipient
        address protocolFeeRecipient;
    }

    /// @dev Storage slot = keccak256(abi.encode(uint256(keccak256("factory.facets.fee.manager")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xabafe0aee5292a745cc432476bbe9b496b2fe07074e3d7dcb579a3e420babf00;

    /// @notice Returns the diamond storage layout
    function getLayout() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }
}
