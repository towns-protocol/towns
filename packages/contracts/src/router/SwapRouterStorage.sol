// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/// @title SwapRouterStorage
/// @notice Storage layout for the SwapRouter contract
library SwapRouterStorage {
    struct Layout {
        address spaceFactory;
    }

    // keccak256(abi.encode(uint256(keccak256("router.swap.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xbaabbaf01fc4f6195bfdcefdfc41afc4577058a099d6e5a21edcf605dd045400;

    function layout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
    }
}
