// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts
import {OwnablePendingSetup} from "./OwnablePendingSetup.sol";

contract OwnablePendingTest is OwnablePendingSetup {
  function test_owner() external {
    assertEq(ownable.owner(), deployer);
  }

  function test_transferOwnership() external {
    address newOwner = _randomAddress();

    vm.prank(deployer);
    ownable.transferOwnership(newOwner);

    assertEq(ownable.pendingOwner(), newOwner);
    assertEq(ownable.owner(), deployer);
  }

  function test_acceptOwnership() external {
    address newOwner = _randomAddress();

    vm.prank(deployer);
    ownable.transferOwnership(newOwner);

    vm.prank(newOwner);
    ownable.acceptOwnership();

    assertEq(ownable.pendingOwner(), address(0));
    assertEq(ownable.owner(), newOwner);
  }
}
