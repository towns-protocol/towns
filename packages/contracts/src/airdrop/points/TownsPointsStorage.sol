// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {MinimalERC20Storage} from "@towns-protocol/diamond/src/primitive/ERC20.sol";

library TownsPointsStorage {
    struct Layout {
        MinimalERC20Storage inner;
        address spaceFactory;
    }

    // keccak256(abi.encode(uint256(keccak256("tokens.points.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x25a22d57af6f735dc617e9781981413da3bc5a71376b4237270a04c144aaf700;

    function layout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
    }
}
