// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {SimpleFaucet} from "contracts/src/utils/SimpleFaucet.sol";

contract SimpleFaucetTest is TestUtils {
  SimpleFaucet private _simpleFaucet;
  address private _deployer;

  function setUp() external {
    _deployer = _randomAddress();
    vm.deal(_deployer, 10 ether);

    vm.startPrank(_deployer);
    _simpleFaucet = new SimpleFaucet();
    (bool sent, ) = address(_simpleFaucet).call{value: 10 ether}("");
    assertTrue(sent);
    vm.stopPrank();
  }

  function test_addBorrower() public {
    address payable borrower = _randomAddress();

    vm.prank(_deployer);
    _simpleFaucet.addBorrower(borrower);

    assertEq(_simpleFaucet.isAllowed(borrower), true);
  }

  function test_removeBorrower() public {
    address payable borrower = _randomAddress();

    vm.startPrank(_deployer);
    _simpleFaucet.addBorrower(borrower);
    _simpleFaucet.removeBorrower(borrower);
    vm.stopPrank();

    assertEq(_simpleFaucet.isAllowed(borrower), false);
  }

  function test_requestTokens() public {
    address payable borrower = _randomAddress();

    vm.prank(_deployer);
    _simpleFaucet.addBorrower(borrower);

    vm.prank(borrower);
    _simpleFaucet.requestTokens(borrower);

    assertEq(address(_simpleFaucet).balance, 9 ether);
    assertEq(borrower.balance, 1 ether);
    assertEq(_simpleFaucet.timelock(borrower), block.timestamp + 1 days);
    assertEq(_simpleFaucet.allowedAmount(), 1 ether);
  }

  function test_withdrawAll() public {
    vm.prank(_deployer);
    _simpleFaucet.withdrawAll();

    assertEq(address(_simpleFaucet).balance, 0);
    assertEq(_deployer.balance, 10 ether);
  }

  /// reverts

  function test_revert_addBorrower() public {
    address payable borrower = _randomAddress();

    vm.prank(borrower);
    vm.expectRevert("SimpleFaucet: not admin");
    _simpleFaucet.addBorrower(borrower);
  }

  function test_revert_requestTokensNotAllowed() public {
    address payable borrower = _randomAddress();

    vm.prank(borrower);
    vm.expectRevert("SimpleFaucet: not allowed");
    _simpleFaucet.requestTokens(borrower);
  }

  function test_revert_requestTokens() public {
    address payable borrower = _randomAddress();

    vm.prank(_deployer);
    _simpleFaucet.addBorrower(borrower);

    vm.prank(borrower);
    _simpleFaucet.requestTokens(borrower);

    vm.prank(borrower);
    vm.expectRevert("SimpleFaucet: timelock not expired");
    _simpleFaucet.requestTokens(borrower);
  }
}
