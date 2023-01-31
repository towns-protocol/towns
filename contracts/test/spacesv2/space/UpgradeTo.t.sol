// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spacesv2/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spacesv2/libraries/Errors.sol";
import {Permissions} from "contracts/src/spacesv2/libraries/Permissions.sol";

import {SpaceBaseSetup} from "contracts/test/spacesv2/SpaceBaseSetup.sol";
import {Space} from "contracts/src/spacesv2/Space.sol";

contract UpgradeToTest is SpaceBaseSetup {
  SpaceV2 public spaceV2;

  function setUp() public {
    SpaceBaseSetup.init();
    spaceV2 = new SpaceV2();
  }

  function testUpgradeTo() external {
    address _creator = _randomAddress();
    address _item = _randomAddress();

    vm.prank(_creator);
    address _space = createSimpleSpace();

    vm.startPrank(_creator);
    Space(_space).upgradeTo(address(spaceV2));
    SpaceV2(_space).addItem(_item);
    vm.stopPrank();

    assertEq(SpaceV2(_space).name(), "zion");
    assertEq(SpaceV2(_space).items(0), _item);
    assertTrue(SpaceV2(_space).isEntitledToSpace(_creator, Permissions.Owner));
  }
}

contract SpaceV2 is Space {
  address[] public items;

  function addItem(address _item) external {
    items.push(_item);
  }
}
