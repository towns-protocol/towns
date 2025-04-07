// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {MinimalERC20Storage} from "@towns-protocol/diamond/src/primitive/ERC20.sol";

library SwapRouterStorage {
    // keccak256(abi.encode(uint256(keccak256("base.swap.router")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xac4f7e23f512993e4dc82e4f274a9cdd54c16849baef61dbe149b26403921e00;

    struct Layout {
        address spaceFactory;
    }

    function layout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
    }
}
