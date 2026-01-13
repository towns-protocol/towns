// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

/// @title FeeTypesLib
/// @notice Library defining fee type constants for the FeeManager system
/// @dev Uses keccak256 for gas-efficient constant generation
library FeeTypesLib {
    /// @notice Fee for space membership purchases (ETH)
    bytes32 internal constant MEMBERSHIP = keccak256("FEE_TYPE.MEMBERSHIP");

    /// @notice Fee for app installations
    bytes32 internal constant APP_INSTALL = keccak256("FEE_TYPE.APP_INSTALL");

    /// @notice Fee for member-to-member tips
    bytes32 internal constant TIP_MEMBER = keccak256("FEE_TYPE.TIP_MEMBER");

    /// @notice Fee for bot tips (typically zero)
    bytes32 internal constant TIP_BOT = keccak256("FEE_TYPE.TIP_BOT");

    /// @notice Protocol fee for swap operations
    bytes32 internal constant SWAP_PROTOCOL = keccak256("FEE_TYPE.SWAP_PROTOCOL");

    /// @notice Poster fee for swap operations
    bytes32 internal constant SWAP_POSTER = keccak256("FEE_TYPE.SWAP_POSTER");

    /// @notice Fee for bot actions
    bytes32 internal constant BOT_ACTION = keccak256("FEE_TYPE.BOT_ACTION");

    /// @notice Fee for domain registration
    bytes32 internal constant DOMAIN_REGISTRATION = keccak256("FEE_TYPE.DOMAIN_REGISTRATION");

    /// @notice Generates fee type for membership based on currency
    /// @param currency The payment currency address
    /// @return The fee type identifier for the given currency
    function membership(address currency) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("FEE_TYPE.MEMBERSHIP", currency));
    }
}
