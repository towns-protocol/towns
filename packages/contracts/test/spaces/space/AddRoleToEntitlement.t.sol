// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spaces/libraries/Errors.sol";
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";

import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {Space} from "contracts/src/spaces/Space.sol";

contract AddRoleToEntitlementTest is SpaceBaseSetup {
  function setUp() public {}

  function testRevertIfRoleIdDoesNotExist() external {
    address _space = createSimpleSpace();
    address _userEntitlement = getSpaceUserEntitlement(_space);
    address _bob = _randomAddress();

    address[] memory _users = new address[](1);
    _users[0] = _bob;

    vm.expectRevert(Errors.RoleDoesNotExist.selector);
    Space(_space).addRoleToEntitlement(
      _randomUint256(),
      DataTypes.Entitlement(_userEntitlement, abi.encode(_users))
    );
  }

  function testRevertIfEntitlementIsNotWhitelisted() external {
    address _space = createSimpleSpace();
    address _bob = _randomAddress();

    // create role
    string memory _roleName = "member";
    string[] memory _permissions = new string[](1);
    _permissions[0] = "Vote";

    DataTypes.Entitlement[] memory _entitlements = new DataTypes.Entitlement[](
      1
    );
    _entitlements[0] = DataTypes.Entitlement({module: address(0), data: ""});

    uint256 _roleId = Space(_space).createRole(
      _roleName,
      _permissions,
      _entitlements
    );

    // add role to entitlement
    vm.expectRevert(Errors.EntitlementNotWhitelisted.selector);
    Space(_space).addRoleToEntitlement(
      _roleId,
      DataTypes.Entitlement(_randomAddress(), abi.encode(_bob))
    );
  }

  function testRevertIfNotAllowedByPermission() external {
    address _space = createSimpleSpace();
    address _userEntitlement = getSpaceUserEntitlement(_space);
    address _bob = _randomAddress();

    vm.prank(_randomAddress());
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).addRoleToEntitlement(
      0,
      DataTypes.Entitlement(_userEntitlement, abi.encode(_bob))
    );
  }

  function testRevertIfEntitlementIdAlreadyExists() external {
    address _space = createSimpleSpace();
    address _userEntitlement = getSpaceUserEntitlement(_space);
    address _bob = _randomAddress();

    // create role
    string memory _roleName = "member";
    string[] memory _permissions = new string[](1);
    _permissions[0] = "Vote";

    DataTypes.Entitlement[] memory _entitlements = new DataTypes.Entitlement[](
      1
    );
    _entitlements[0] = DataTypes.Entitlement({module: address(0), data: ""});

    uint256 _roleId = Space(_space).createRole(
      _roleName,
      _permissions,
      _entitlements
    );

    address[] memory _users = new address[](1);
    _users[0] = _bob;

    // add role to entitlement
    Space(_space).addRoleToEntitlement(
      _roleId,
      DataTypes.Entitlement(_userEntitlement, abi.encode(_users))
    );

    vm.expectRevert(Errors.EntitlementAlreadyExists.selector);
    Space(_space).addRoleToEntitlement(
      _roleId,
      DataTypes.Entitlement(_userEntitlement, abi.encode(_users))
    );
  }

  function testAddRoleToEntitlement() external {
    address _space = createSimpleSpace();
    address _userEntitlement = getSpaceUserEntitlement(_space);
    address _bob = _randomAddress();

    // create role
    string memory _roleName = "member";
    string[] memory _permissions = new string[](1);
    _permissions[0] = "UniquePermision";

    DataTypes.Entitlement[] memory _entitlements = new DataTypes.Entitlement[](
      1
    );
    _entitlements[0] = DataTypes.Entitlement({module: address(0), data: ""});

    uint256 _roleId = Space(_space).createRole(
      _roleName,
      _permissions,
      _entitlements
    );

    address[] memory _users = new address[](1);
    _users[0] = _bob;

    // add role to entitlement
    DataTypes.Entitlement memory _roleEntitlement;
    _roleEntitlement.module = _userEntitlement;
    _roleEntitlement.data = abi.encode(_users);

    Space(_space).addRoleToEntitlement(_roleId, _roleEntitlement);
    assertTrue(Space(_space).isEntitledToSpace(_bob, "UniquePermision"));
  }
}
