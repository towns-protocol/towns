// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spaces/libraries/Errors.sol";
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";

import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {Space} from "contracts/src/spaces/Space.sol";
import {TokenEntitlement} from "contracts/src/spaces/entitlements/TokenEntitlement.sol";

contract SpaceUpgradeToTest is SpaceBaseSetup {
  SpaceV2 public spaceV2;
  TokenV2 public tokenV2;

  function setUp() public {
    spaceV2 = new SpaceV2();
    tokenV2 = new TokenV2();
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

  function testRevertUpgradeTo() external {
    address _creator = _randomAddress();

    vm.prank(_creator);
    address _space = createSimpleSpace();

    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).upgradeTo(address(spaceV2));
  }

  function testUpgradeTokenEntitlement() external {
    address _creator = _randomAddress();

    vm.prank(_creator);
    address _space = createSimpleSpace();

    address _tokenEntitlement = Space(_space).getEntitlementByModuleType(
      "TokenEntitlement"
    );

    vm.prank(_creator);
    vm.expectRevert(Errors.NotAllowed.selector);
    TokenEntitlement(_tokenEntitlement).upgradeTo(address(tokenV2));

    vm.prank(_creator);
    Space(_space).upgradeEntitlement(_tokenEntitlement, address(tokenV2));
  }
}

contract TokenV2 is TokenEntitlement {}

contract SpaceV2 is Space {
  address[] public items;

  function addItem(address _item) external {
    items.push(_item);
  }
}
