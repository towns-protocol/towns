// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spacesv2/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spacesv2/libraries/Errors.sol";
import {Permissions} from "contracts/src/spacesv2/libraries/Permissions.sol";

import {BaseSetup} from "contracts/test/spacesv2/BaseSetup.sol";
import {Space} from "contracts/src/spacesv2/Space.sol";

contract SpaceTestAddRoleToEntitlement is BaseSetup {
  function setUp() public {
    BaseSetup.init();
  }

  function testRevertIfRoleIdDoesNotExist() external {
    address _space = createSimpleSpace();
    address _userEntitlement = getSpaceUserEntitlement(_space);
    address _bob = _randomAddress();

    vm.expectRevert(Errors.RoleDoesNotExist.selector);
    Space(_space).addRoleToEntitlement(
      _randomUint256(),
      _userEntitlement,
      abi.encode(_bob)
    );
  }

  function testRevertIfEntitlementIsNotWhitelisted() external {
    address _space = createSimpleSpace();
    address _bob = _randomAddress();

    // create role
    string memory _roleName = "Member";
    string[] memory _permissions = new string[](1);
    _permissions[0] = "Vote";

    uint256 _roleId = Space(_space).createRole(_roleName, _permissions);

    // add role to entitlement
    vm.expectRevert(Errors.EntitlementNotWhitelisted.selector);
    Space(_space).addRoleToEntitlement(
      _roleId,
      _randomAddress(),
      abi.encode(_bob)
    );
  }

  function testRevertIfNotAllowedByPermission() external {
    address _space = createSimpleSpace();
    address _userEntitlement = getSpaceUserEntitlement(_space);
    address _bob = _randomAddress();

    vm.prank(_randomAddress());
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).addRoleToEntitlement(0, _userEntitlement, abi.encode(_bob));
  }

  function testRevertIfEntitlementIdAlreadyExists() external {
    address _space = createSimpleSpace();
    address _userEntitlement = getSpaceUserEntitlement(_space);
    address _bob = _randomAddress();

    // create role
    string memory _roleName = "Member";
    string[] memory _permissions = new string[](1);
    _permissions[0] = "Vote";
    uint256 _roleId = Space(_space).createRole(_roleName, _permissions);

    // add role to entitlement
    Space(_space).addRoleToEntitlement(
      _roleId,
      _userEntitlement,
      abi.encode(_bob)
    );

    vm.expectRevert(Errors.EntitlementAlreadyExists.selector);
    Space(_space).addRoleToEntitlement(
      _roleId,
      _userEntitlement,
      abi.encode(_bob)
    );
  }

  function testAddRoleToEntitlement() external {
    address _space = createSimpleSpace();
    address _userEntitlement = getSpaceUserEntitlement(_space);
    address _bob = _randomAddress();

    // create role
    string memory _roleName = "Member";
    string[] memory _permissions = new string[](1);
    _permissions[0] = "UniquePermision";

    uint256 _roleId = Space(_space).createRole(_roleName, _permissions);

    // add role to entitlement
    Space(_space).addRoleToEntitlement(
      _roleId,
      _userEntitlement,
      abi.encode(_bob)
    );
    assertTrue(Space(_space).isEntitledToSpace(_bob, "UniquePermision"));
  }
}
