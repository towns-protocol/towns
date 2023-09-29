// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils

//interfaces
import {IPioneerBase} from "contracts/src/tokens/pioneer/IPioneer.sol";
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";

//libraries

//contracts
import {PioneerSetup} from "./PioneerSetup.sol";

contract PioneerTest is IPioneerBase, IOwnableBase, PioneerSetup {
  function test_mintTo() external {
    address futurePioneer = _randomAddress();

    vm.prank(deployer);
    pioneer.mintTo(futurePioneer);

    assertEq(pioneer.balanceOf(futurePioneer), 1);
    assertEq(futurePioneer.balance, 0.1 ether);
  }

  function test_mintTo_revert_NotAllowed() external {
    address minter = _randomAddress();

    vm.prank(minter);
    vm.expectRevert(NotAllowed.selector);
    pioneer.mintTo(_randomAddress());
  }

  function test_mintTo_revert_ZeroAddress() external {
    vm.expectRevert(NotAllowed.selector);
    pioneer.mintTo(address(0));
  }

  function test_mintTo_revert_AlreadyMinted() external {
    address futurePioneer = _randomAddress();

    vm.prank(deployer);
    pioneer.mintTo(futurePioneer);

    vm.prank(deployer);
    vm.expectRevert(AlreadyMinted.selector);
    pioneer.mintTo(futurePioneer);
  }

  function test_mintTo_revert_InsufficientBalance() external {
    address futurePioneer = _randomAddress();

    vm.prank(deployer);
    pioneer.withdraw(deployer);

    vm.prank(deployer);
    vm.expectRevert(InsufficientBalance.selector);
    pioneer.mintTo(futurePioneer);
  }

  function test_withdraw() external {
    address futurePioneer = _randomAddress();

    vm.prank(deployer);
    pioneer.mintTo(futurePioneer);

    vm.prank(deployer);
    pioneer.withdraw(deployer);

    assertEq(futurePioneer.balance, 0.1 ether);
    assertEq(deployer.balance, 5 ether - 0.1 ether);
    assertEq(address(pioneer).balance, 0);
  }

  function test_withdraw_revert_NotAllowed() external {
    address random = _randomAddress();

    vm.prank(random);
    vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, random));
    pioneer.withdraw(_randomAddress());
  }
}
