// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces
import {ISpaceUpgrades} from "contracts/src/spaces/interfaces/ISpaceUpgrades.sol";

//libraries
import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";

//contracts
import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {Space} from "contracts/src/spaces/Space.sol";

contract SpaceUpgradesUpgrade is SpaceBaseSetup {
  address internal _owner;
  address internal _spacev2;

  function setUp() external {
    _owner = makeAddr("owner");
    _spacev2 = address(new SpaceV2());
  }

  function test_revertIfNotAllowed() external {
    vm.prank(_owner);
    address space = createSimpleSpace();

    spaceUpgrades.setDelayPeriod(block.timestamp + 1 days);

    vm.expectRevert(ISpaceUpgrades.UpgradeNotAllowed.selector);
    vm.prank(_owner);
    spaceUpgrades.upgrade(space);
  }

  function test_revertIfSpaceNotRegistered() external {
    vm.expectRevert(ISpaceUpgrades.SpaceNotRegistered.selector);
    vm.prank(_owner);
    spaceUpgrades.upgrade(makeAddr("not-registered"));
  }

  function test_revertAlreadyUpgraded() external {
    address space = createSimpleSpace();

    vm.expectRevert(ISpaceUpgrades.SpaceAlreadyUpgraded.selector);
    vm.prank(_owner);
    spaceUpgrades.upgrade(space);
  }

  function test_revertUpgradeNotAllowed() external {
    vm.prank(_owner);
    address space = createSimpleSpace();

    spaceFactory.setPaused(true);
    spaceFactory.updateImplementations(
      address(_spacev2),
      address(0),
      address(0),
      address(0),
      address(0)
    );
    spaceFactory.setPaused(false);

    // upgrade the space
    vm.prank(_owner);
    spaceUpgrades.upgrade(space);

    spaceFactory.setPaused(true);
    spaceFactory.updateImplementations(
      address(spaceImplementation),
      address(0),
      address(0),
      address(0),
      address(0)
    );
    spaceFactory.setPaused(false);

    // upgrade the space
    vm.expectRevert(ISpaceUpgrades.UpgradeNotAllowed.selector);
    vm.prank(_owner);
    spaceUpgrades.upgrade(space);
  }

  function test_revertNotAllowed() external {
    vm.prank(_owner);
    address space = createSimpleSpace();

    spaceFactory.setPaused(true);
    spaceFactory.updateImplementations(
      address(_spacev2),
      address(0),
      address(0),
      address(0),
      address(0)
    );
    spaceFactory.setPaused(false);

    DataTypes.Role[] memory roles = Space(space).getRoles();

    DataTypes.Role memory role;

    for (uint256 i = 0; i < roles.length; i++) {
      if (_isEqual(roles[i].name, "Upgrade")) {
        role = roles[i];
        break;
      }
    }

    string[] memory permissions = new string[](1);
    permissions[0] = Permissions.Upgrade;

    vm.prank(_owner);
    Space(space).removePermissionsFromRole(role.roleId, permissions);

    vm.expectRevert(ISpaceUpgrades.NotEntitled.selector);
    vm.prank(_owner);
    spaceUpgrades.upgrade(space);
  }

  function test_upgrade() external {
    address space = createSimpleSpace();

    spaceFactory.setPaused(true);
    spaceFactory.updateImplementations(
      address(_spacev2),
      address(0),
      address(0),
      address(0),
      address(0)
    );
    spaceFactory.setPaused(false);

    // upgrade the space
    vm.prank(_owner);
    spaceUpgrades.upgrade(space);

    assertEq(Space(space).contractVersion(), Space(_spacev2).contractVersion());
  }
}

contract SpaceV2 is Space {
  function contractVersion() external pure override returns (uint8) {
    return uint8(2);
  }
}
