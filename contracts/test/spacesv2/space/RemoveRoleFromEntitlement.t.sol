// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spacesv2/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spacesv2/libraries/Errors.sol";
import {Permissions} from "contracts/src/spacesv2/libraries/Permissions.sol";

import {BaseSetup} from "contracts/test/spacesv2/BaseSetup.sol";
import {Space} from "contracts/src/spacesv2/Space.sol";

import {console} from "forge-std/console.sol";

contract RemoveRoleFromEntitlementTest is BaseSetup {
  function setUp() public {
    BaseSetup.init();
  }

  function testRevertIfRemovingOwnerRole() external {
    address _space = createSimpleSpace();
    address _owner = Space(_space).owner();
    uint256 _ownerRoleId = Space(_space).ownerRoleId();

    address _userEntitlement = getSpaceUserEntitlement(_space);

    DataTypes.Entitlement memory _entitlement;
    _entitlement.module = _userEntitlement;
    _entitlement.data = abi.encode(_owner);

    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).removeRoleFromEntitlement(_ownerRoleId, _entitlement);
  }

  function testRevertIfRoleNotExists() external {
    address _space = createSimpleSpace();
    address _bob = _randomAddress();
    address _userEntitlement = getSpaceUserEntitlement(_space);
    uint256 _randomRoleId = _randomUint256();

    DataTypes.Entitlement memory _entitlement;
    _entitlement.module = _userEntitlement;
    _entitlement.data = abi.encode(_bob);

    vm.expectRevert(Errors.RoleDoesNotExist.selector);
    Space(_space).removeRoleFromEntitlement(_randomRoleId, _entitlement);
  }

  function testRevertIfNotWhitelisted() external {
    address _space = createSimpleSpace();
    address _bob = _randomAddress();
    address _randomEntitlement = _randomAddress();
    uint256 _randomRoleId = _randomUint256();

    DataTypes.Entitlement memory _entitlement;
    _entitlement.module = _randomEntitlement;
    _entitlement.data = abi.encode(_bob);

    vm.expectRevert(Errors.EntitlementNotWhitelisted.selector);
    Space(_space).removeRoleFromEntitlement(_randomRoleId, _entitlement);
  }

  function testRevertIfNotAllowedByPermission() external {
    address _space = createSimpleSpace();
    address _userEntitlement = getSpaceUserEntitlement(_space);
    address _bob = _randomAddress();

    DataTypes.Entitlement memory _entitlement;
    _entitlement.module = _userEntitlement;
    _entitlement.data = abi.encode(_bob);

    // create role
    uint256 _roleId = createSimpleRoleWithPermission(_space);

    // add role to entitlement
    Space(_space).addRoleToEntitlement(
      _roleId,
      DataTypes.Entitlement(_userEntitlement, abi.encode(_bob))
    );

    vm.prank(_randomAddress());
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).removeRoleFromEntitlement(_roleId, _entitlement);
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
      _roleId,
      DataTypes.Entitlement(_userEntitlement, abi.encode(_alice))
    );

    Space(_space).addRoleToEntitlement(
      _roleId,
      DataTypes.Entitlement(_userEntitlement, abi.encode(_bob))
    );

    assertTrue(Space(_space).isEntitledToSpace(_bob, "Vote"));

    DataTypes.Entitlement memory _entitlement;
    _entitlement.module = _userEntitlement;
    _entitlement.data = abi.encode(_bob);

    // remove role from entitlement
    Space(_space).removeRoleFromEntitlement(_roleId, _entitlement);

    assertFalse(Space(_space).isEntitledToSpace(_bob, "Vote"));
  }
}
