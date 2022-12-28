// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spacesv2/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spacesv2/libraries/Errors.sol";
import {Permissions} from "contracts/src/spacesv2/libraries/Permissions.sol";

import {BaseSetup} from "contracts/test/spacesv2/BaseSetup.sol";
import {Space} from "contracts/src/spacesv2/Space.sol";

contract SpaceTestSetOwnerRoleId is BaseSetup {
  function setUp() public {
    BaseSetup.init();
  }

  function testRevertIfNotOwner() external {
    address _space = createSimpleSpace();

    uint256 _newRoleId = _randomUint256();

    vm.prank(_randomAddress());
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).setOwnerRoleId(_newRoleId);
  }

  function testRevertIfNotValidRoleId() external {
    address _space = createSimpleSpace();

    uint256 _invalidRoleId = _randomUint256();

    vm.expectRevert(Errors.RoleDoesNotExist.selector);
    Space(_space).setOwnerRoleId(_invalidRoleId);
  }

  function testRevertIfMissingOwnerPermission() external {
    address _space = createSimpleSpace();

    string memory _roleName = "NewOwner";
    string[] memory _permissions = new string[](1);
    _permissions[0] = "Vote";

    uint256 _newRoleId = Space(_space).createRole(_roleName, _permissions);

    vm.expectRevert(Errors.MissingOwnerPermission.selector);
    Space(_space).setOwnerRoleId(_newRoleId);
  }

  function testSetOwnerRoleId() external {
    address _space = createSimpleSpace();

    string memory _roleName = "NewOwner";
    string[] memory _permissions = spaceFactory.getOwnerPermissions();

    uint256 _newRoleId = Space(_space).createRole(_roleName, _permissions);

    Space(_space).setOwnerRoleId(_newRoleId);

    assertEq(Space(_space).ownerRoleId(), _newRoleId);
  }
}
