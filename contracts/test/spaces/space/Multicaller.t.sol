// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spaces/libraries/Errors.sol";
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";

import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {Space} from "contracts/src/spaces/Space.sol";
import {MultiCaller} from "contracts/src/utils/MultiCaller.sol";

contract SimpleMultiCall is MultiCaller {
  function revertWithString() external pure {
    revert("This is a revert");
  }
}

contract MultiCallerTest is SpaceBaseSetup {
  SimpleMultiCall internal simpleMultiCall;

  function setUp() external {
    simpleMultiCall = new SimpleMultiCall();
  }

  function testRevertStringMultiCaller() external {
    bytes[] memory _data = new bytes[](1);
    _data[0] = abi.encodeCall(simpleMultiCall.revertWithString, ());

    vm.expectRevert(bytes("This is a revert"));
    simpleMultiCall.multicall(_data);
  }

  function testRevertMultiCaller() external {
    address _space = createSimpleSpace();
    string memory _newRoleName = "new-role-name";

    bytes[] memory _data = new bytes[](1);
    _data[0] = abi.encodeCall(
      Space(_space).updateRole,
      (_randomUint256(), _newRoleName)
    );

    vm.expectRevert(Errors.RoleDoesNotExist.selector);
    Space(_space).multicall(_data);
  }

  function testMultiCaller() external {
    address _space = createSimpleSpace();

    string memory _roleName = "member";
    string[] memory _rolePermissions = new string[](1);
    _rolePermissions[0] = "Vote";

    DataTypes.Entitlement[]
      memory _roleEntitlements = new DataTypes.Entitlement[](1);
    _roleEntitlements[0] = DataTypes.Entitlement({
      module: address(0),
      data: ""
    });

    uint256 _roleId = Space(_space).createRole(
      _roleName,
      _rolePermissions,
      _roleEntitlements
    );

    string memory _newRoleName = "new-role-name";
    string[] memory _newRolePermissions = new string[](1);
    _newRolePermissions[0] = "Veto";

    bytes[] memory _data = new bytes[](2);
    _data[0] = abi.encodeCall(
      Space(_space).updateRole,
      (_roleId, _newRoleName)
    );
    _data[1] = abi.encodeCall(
      Space(_space).addPermissionsToRole,
      (_roleId, _newRolePermissions)
    );

    Space(_space).multicall(_data);

    DataTypes.Role memory _role = Space(_space).getRoleById(_roleId);

    string[] memory _permissions = Space(_space).getPermissionsByRoleId(
      _roleId
    );

    assertEq(_role.name, _newRoleName);
    assertEq(_permissions.length, 2);
  }
}
