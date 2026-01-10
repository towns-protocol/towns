// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {DropGroup} from "./DropGroup.sol";

library DropStorage {
    struct Layout {
        address rewardsDistribution;
        uint48 conditionStartId;
        uint48 conditionCount;
        mapping(uint256 groupId => DropGroup.Layout) groupById;
    }

    // keccak256(abi.encode(uint256(keccak256("diamond.facets.drop.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xeda6a1e2ce6f1639b6d3066254ca87a2daf51c4f0ad5038d408bbab6cc2cab00;

    function getLayout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
    }
}
