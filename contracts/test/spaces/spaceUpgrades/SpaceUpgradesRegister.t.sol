// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import {MockERC165} from "contracts/test/mocks/MockERC165.sol";
import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {SpaceUpgrades} from "contracts/src/spaces/SpaceUpgrades.sol";
import {ISpaceUpgrades} from "contracts/src/spaces/interfaces/ISpaceUpgrades.sol";

contract SpaceUpgradesRegister is SpaceBaseSetup {
  address internal _owner;

  function setUp() external {
    _owner = makeAddr("owner");
  }

  function test_revertIfNotOwner() external {
    vm.prank(_owner);
    address space = createSimpleSpace();

    address notOwner = makeAddr("notOwner");

    vm.expectRevert(ISpaceUpgrades.NotSpaceOwner.selector);
    vm.prank(notOwner);
    spaceUpgrades.register(space, address(spaceImplementation));
  }

  function test_revertIfInvalidInterface() external {
    vm.prank(_owner);
    address space = address(new MockERC165());

    vm.expectRevert(ISpaceUpgrades.InvalidInterface.selector);
    vm.prank(_owner);
    spaceUpgrades.register(space, address(spaceImplementation));
  }

  function test_revertIfAlreadyRegistered() external {
    vm.prank(_owner);
    address space = createSimpleSpace();

    vm.expectRevert(ISpaceUpgrades.SpaceAlreadyRegistered.selector);
    vm.prank(_owner);
    spaceUpgrades.register(space, address(spaceImplementation));
  }

  function test_register() external {
    vm.prank(_owner);
    address space = createSimpleSpace();

    vm.prank(_owner);
    spaceUpgrades.unregister(space);

    vm.prank(_owner);
    spaceUpgrades.register(space, address(spaceImplementation));

    (, address implementation) = spaceUpgrades.upgradesBySpaceAddress(space);

    assertEq(implementation, address(spaceImplementation));
  }

  function test_registered() external {
    vm.prank(_owner);
    createSimpleSpace();

    ISpaceUpgrades.UpgradeInfo[] memory info = spaceUpgrades.registered();

    assertEq(info.length, 1);
  }
}
