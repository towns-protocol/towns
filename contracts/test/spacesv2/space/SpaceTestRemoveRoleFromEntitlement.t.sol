// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spacesv2/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spacesv2/libraries/Errors.sol";
import {Permissions} from "contracts/src/spacesv2/libraries/Permissions.sol";

import {BaseSetup} from "contracts/test/spacesv2/BaseSetup.sol";
import {Space} from "contracts/src/spacesv2/Space.sol";

contract SpaceTestRemoveRoleFromEntitlement is BaseSetup {
  function setUp() public {
    BaseSetup.init();
  }

  function testRevertIfRoleNotExists() external {
    address _space = createSimpleSpace();
    address _bob = _randomAddress();
    address _userEntitlement = getSpaceUserEntitlement(_space);
    uint256 _randomRoleId = _randomUint256();

    vm.expectRevert(Errors.RoleDoesNotExist.selector);
    Space(_space).removeRoleFromEntitlement(
      _userEntitlement,
      _randomRoleId,
      abi.encode(_bob)
    );
  }

  function testRevertIfNotWhitelisted() external {
    address _space = createSimpleSpace();
    address _bob = _randomAddress();
    address _randomEntitlement = _randomAddress();
    uint256 _randomRoleId = _randomUint256();

    vm.expectRevert(Errors.EntitlementNotWhitelisted.selector);
    Space(_space).removeRoleFromEntitlement(
      _randomEntitlement,
      _randomRoleId,
      abi.encode(_bob)
    );
  }

  function testRevertIfNotAllowedByPermission() external {
    address _space = createSimpleSpace();
    address _userEntitlement = getSpaceUserEntitlement(_space);
    address _bob = _randomAddress();

    // create role
    uint256 _roleId = createSimpleRoleWithPermission(_space);

    // add role to entitlement
    Space(_space).addRoleToEntitlement(
      _userEntitlement,
      _roleId,
      abi.encode(_bob)
    );

    vm.prank(_randomAddress());
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).removeRoleFromEntitlement(
      _userEntitlement,
      _roleId,
      abi.encode(_bob)
    );
  }

  function testRemoveRoleFromEntitlement() external {
    address _space = createSimpleSpace();
    address _userEntitlement = getSpaceUserEntitlement(_space);
    address _bob = _randomAddress();
    address _alice = _randomAddress();

    // create role
    uint256 _roleId = createSimpleRoleWithPermission(_space);

    // add role to entitlement
    Space(_space).addRoleToEntitlement(
      _userEntitlement,
      _roleId,
      abi.encode(_alice)
    );

    Space(_space).addRoleToEntitlement(
      _userEntitlement,
      _roleId,
      abi.encode(_bob)
    );

    assertTrue(Space(_space).isEntitled(_bob, "Vote"));

    // remove role from entitlement
    Space(_space).removeRoleFromEntitlement(
      _userEntitlement,
      _roleId,
      abi.encode(_bob)
    );

    assertFalse(Space(_space).isEntitled(_bob, "Vote"));
  }
}
