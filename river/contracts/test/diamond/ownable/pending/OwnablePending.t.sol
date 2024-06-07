// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {OwnablePendingSetup} from "./OwnablePendingSetup.sol";

contract OwnablePendingTest is OwnablePendingSetup {
  function test_currentOwner() external {
    assertEq(ownable.currentOwner(), deployer);
  }

  function test_transferOwnership() external {
    address newOwner = _randomAddress();

    vm.prank(deployer);
    ownable.startTransferOwnership(newOwner);

    assertEq(ownable.pendingOwner(), newOwner);
    assertEq(ownable.currentOwner(), deployer);
  }

  function test_acceptOwnership() external {
    address newOwner = _randomAddress();

    vm.prank(deployer);
    ownable.startTransferOwnership(newOwner);

    vm.prank(newOwner);
    ownable.acceptOwnership();

    assertEq(ownable.pendingOwner(), address(0));
    assertEq(ownable.currentOwner(), newOwner);
  }
}
