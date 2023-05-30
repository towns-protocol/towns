// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

import {Operator} from "contracts/src/tokens/Operator.sol";

contract OperatorTest is TestUtils {
  Operator private operator;

  function setUp() external {
    operator = new Operator("Operator", "OPERATOR", address(this), 10);
  }

  function test_mintTo() external {
    address owner = _randomAddress();
    operator.mintTo(owner);
    assertEq(operator.balanceOf(owner), 1);
  }

  function test_revertIfTryingToTransfer() external {
    address owner = _randomAddress();
    operator.mintTo(owner);

    address to = _randomAddress();
    uint256 tokenId = 0;

    vm.prank(owner);
    vm.expectRevert();
    operator.safeTransferFrom(owner, to, tokenId);
  }
}
