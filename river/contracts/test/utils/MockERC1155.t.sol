// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TestUtils} from "./TestUtils.sol";
import {MockERC1155} from "contracts/test/mocks/MockERC1155.sol";

contract MockERC1155Test is TestUtils {
  MockERC1155 public mockToken;

  function setUp() public {
    mockToken = new MockERC1155();
  }

  function test_mintGold(address user) external {
    vm.assume(user != address(0));
    vm.assume(user.code.length == 0);

    vm.prank(user);
    mockToken.mintGold(user);

    assertEq(mockToken.balanceOf(user, mockToken.GOLD()), 1);
  }
}
