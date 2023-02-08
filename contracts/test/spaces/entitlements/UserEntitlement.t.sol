// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

// Interfaces
import {IEntitlement} from "contracts/src/interfaces/IEntitlement.sol";

// Libraries
import {Errors} from "contracts/src/libraries/Errors.sol";
import {DataTypes} from "contracts/src/libraries/DataTypes.sol";

// Contracts
import {Space} from "contracts/src/core/spaces/Space.sol";
import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {UserEntitlement} from "contracts/src/core/spaces/entitlements/UserEntitlement.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {console} from "forge-std/console.sol";

contract UserEntitlementTest is SpaceBaseSetup {
  address internal entitlementAddress;
  UserEntitlement internal implementation;
  UserEntitlement internal userEntitlement;
  uint256 tokenId;

  function setUp() public {
    SpaceBaseSetup.init();

    vm.prank(address(spaceFactory));
    tokenId = spaceToken.mintTo(address(this), "");

    implementation = new UserEntitlement();
    entitlementAddress = address(
      new ERC1967Proxy(
        address(implementation),
        abi.encodeCall(
          UserEntitlement.initialize,
          (address(spaceToken), tokenId)
        )
      )
    );
    userEntitlement = UserEntitlement(entitlementAddress);
    userEntitlement.setSpace(address(this));
  }

  function testUpgradeTo() external {
    UserEntitlementv2 implementation2 = new UserEntitlementv2();

    UserEntitlement(entitlementAddress).upgradeTo(address(implementation2));

    assertEq(UserEntitlementv2(entitlementAddress).name(), "User Entitlement");
  }

  function testSupportInterface() external {
    bytes4 interfaceId = type(IEntitlement).interfaceId;
    assertTrue(userEntitlement.supportsInterface(interfaceId));
  }

  function testRevertIfAddRoleToChannel() external {
    uint256 roleId = _randomUint256();
    string memory channelId = "some-channel";

    userEntitlement.addRoleIdToChannel(channelId, roleId);

    vm.expectRevert(Errors.RoleAlreadyExists.selector);
    userEntitlement.addRoleIdToChannel(channelId, roleId);
  }

  function testRemoveRoleIdFromChannel() external {
    string memory channelId = "some-channel";

    uint256 roleId = _randomUint256();
    uint256 roleId2 = _randomUint256();

    userEntitlement.addRoleIdToChannel(channelId, roleId);

    userEntitlement.addRoleIdToChannel(channelId, roleId2);
    userEntitlement.removeRoleIdFromChannel(channelId, roleId2);
  }

  function testRevertIfEntitlementUserNotFound() external {
    uint256 roleId = _randomUint256();
    address nonExistentUser = _randomAddress();

    vm.expectRevert(Errors.EntitlementNotFound.selector);
    userEntitlement.removeEntitlement(roleId, abi.encode(nonExistentUser));
  }

  function testGetUserRoles() external {
    address _creator = _randomAddress();

    vm.prank(_creator);
    address _space = createSimpleSpace();

    string memory _roleName = "TestRole";
    string[] memory _rolePermissions = new string[](1);
    _rolePermissions[0] = "TestPermission";

    DataTypes.Entitlement[] memory _entitlements = new DataTypes.Entitlement[](
      1
    );
    _entitlements[0] = DataTypes.Entitlement({module: address(0), data: ""});

    vm.prank(_creator);
    uint256 _roleId = Space(_space).createRole(
      _roleName,
      _rolePermissions,
      _entitlements
    );
    address _userEntitlement = getSpaceUserEntitlement(_space);

    address[] memory users = new address[](1);
    users[0] = _creator;

    vm.prank(_creator);
    Space(_space).addRoleToEntitlement(
      _roleId,
      DataTypes.Entitlement(_userEntitlement, abi.encode(users))
    );

    DataTypes.Role[] memory roles = IEntitlement(_userEntitlement).getUserRoles(
      _creator
    );

    assertEq(roles.length, 1);

    DataTypes.Role memory role = roles[0];
    assertEq(role.roleId, _roleId);
    assertEq(role.name, _roleName);
  }

  function testRemoveEntitlement() external {
    uint256 roleId = _randomUint256();
    address user = _randomAddress();

    address[] memory users = new address[](1);
    users[0] = user;

    address[] memory emptyUsers = new address[](0);
    vm.expectRevert(Errors.EntitlementNotFound.selector);
    userEntitlement.setEntitlement(roleId, abi.encode(emptyUsers));

    address[] memory invalidUsers = new address[](1);
    invalidUsers[0] = address(0);
    vm.expectRevert(Errors.AddressNotFound.selector);
    userEntitlement.setEntitlement(roleId, abi.encode(invalidUsers));

    userEntitlement.setEntitlement(_randomUint256(), abi.encode(users));
    userEntitlement.setEntitlement(roleId, abi.encode(users));

    userEntitlement.getEntitlementDataByRoleId(roleId);

    userEntitlement.removeEntitlement(roleId, abi.encode(users));
  }
}

contract UserEntitlementv2 is UserEntitlement {}
