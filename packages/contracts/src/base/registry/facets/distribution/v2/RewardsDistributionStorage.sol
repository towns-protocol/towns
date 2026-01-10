// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// interfaces

// libraries

import {StakingRewards} from "./StakingRewards.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

library RewardsDistributionStorage {
    /// @notice The layout of the rewards distribution storage
    /// @param staking The storage of the staking rewards logic
    /// @param proxyById The mapping of deposit ID to proxy address
    /// @param isRewardNotifier The mapping of reward notifier whitelist
    /// @param depositsByDepositor The mapping of deposit IDs by depositor
    struct Layout {
        StakingRewards.Layout staking;
        mapping(uint256 depositId => address proxy) proxyById;
        mapping(address rewardNotifier => bool) isRewardNotifier;
        mapping(address depositor => EnumerableSet.UintSet) depositsByDepositor;
        uint256 periodRewardAmount;
    }

    // keccak256(abi.encode(uint256(keccak256("facets.registry.rewards.distribution.v2.storage")) -
    // 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x7b071c8e0da733b969167f083e1913dbb26456aeda63d64176fc92d3926ff300;

    function layout() internal pure returns (Layout storage s) {
        assembly {
            s.slot := STORAGE_SLOT
        }
    }
}
