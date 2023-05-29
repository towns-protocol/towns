// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spaces/libraries/Errors.sol";
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";

import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {Space} from "contracts/src/spaces/Space.sol";

contract SetOwnerRoleIdTest is SpaceBaseSetup {
  function setUp() public {}

  function testRevertIfNotOwner() external {
    address _space = createSimpleSpace();

    uint256 _newRoleId = _randomUint256();

    vm.prank(_randomAddress());
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).setOwnerRoleId(_newRoleId);
  }

  function testSetOwnerRoleId() external {
    address _space = createSimpleSpace();

    string memory _roleName = "NewOwner";
    string[] memory _permissions = new string[](2);
    _permissions[0] = "Vote";
    _permissions[1] = "Veto";

    DataTypes.Entitlement[]
      memory _roleEntitlements = new DataTypes.Entitlement[](1);
    _roleEntitlements[0] = DataTypes.Entitlement({
      module: address(0),
      data: ""
    });

    uint256 newRoleId = Space(_space).createRole(
      _roleName,
      _permissions,
      _roleEntitlements
    );

    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).setOwnerRoleId(newRoleId);
  }
}
