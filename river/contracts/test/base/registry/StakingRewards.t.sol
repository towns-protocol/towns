// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import {StakingRewards} from "contracts/src/base/registry/facets/distribution/v2/StakingRewards.sol";

contract StakingRewardsTest is Test {
  StakingRewards.Deposit internal deposit;
  uint256 internal slotAfterDeposit;

  function test_deposit_struct() public pure {
    uint256 length;
    assembly {
      length := sub(slotAfterDeposit.slot, deposit.slot)
    }
    assertEq(length, 3);
  }

  StakingRewards.Treasure internal treasure;
  uint256 internal slotAfterTreasure;

  function test_treasure_struct() public pure {
    uint256 length;
    assembly {
      length := sub(slotAfterTreasure.slot, treasure.slot)
    }
    assertEq(length, 3);
  }

  StakingRewards.Layout internal layout;
  uint256 internal slotAfterLayout;

  function test_layout_struct() public pure {
    uint256 length;
    assembly {
      length := sub(slotAfterLayout.slot, layout.slot)
    }
    assertEq(length, 12);
  }
}
