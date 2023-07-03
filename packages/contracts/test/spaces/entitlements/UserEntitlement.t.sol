// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

// Interfaces
import {IEntitlement} from "contracts/src/spaces/interfaces/IEntitlement.sol";

// Libraries
import {Errors} from "contracts/src/spaces/libraries/Errors.sol";
import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";

// Contracts
import {Space} from "contracts/src/spaces/Space.sol";
import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {UserEntitlement} from "contracts/src/spaces/entitlements/UserEntitlement.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract UserEntitlementSpaceTest is SpaceBaseSetup {
  address internal _entitlementAddress;
  UserEntitlement internal _implementation;
  UserEntitlement internal _userEntitlement;
  uint256 internal _tokenId;

  function setUp() public {
    _tokenId = spaceToken.nextTokenId();

    vm.prank(address(spaceFactory));
    spaceToken.mintTo(address(this), "");

    _implementation = new UserEntitlement();
    _entitlementAddress = address(
      new ERC1967Proxy(
        address(_implementation),
        abi.encodeCall(
          UserEntitlement.initialize,
          (address(spaceToken), _tokenId)
        )
      )
    );
    _userEntitlement = UserEntitlement(_entitlementAddress);
    _userEntitlement.setSpace(address(this));
  }

  function testUpgradeTo() external {
    UserEntitlementv2 implementation2 = new UserEntitlementv2();

    UserEntitlement(_entitlementAddress).upgradeTo(address(implementation2));

    assertEq(UserEntitlementv2(_entitlementAddress).name(), "User Entitlement");
  }

  function testSupportInterface() external {
    bytes4 interfaceId = type(IEntitlement).interfaceId;
    assertTrue(_userEntitlement.supportsInterface(interfaceId));
  }

  function testRevertIfAddRoleToChannel() external {
    uint256 roleId = _randomUint256();
    string memory channelId = "some-channel";

    _userEntitlement.addRoleIdToChannel(channelId, roleId);

    vm.expectRevert(Errors.RoleAlreadyExists.selector);
    _userEntitlement.addRoleIdToChannel(channelId, roleId);
  }

  function testRemoveRoleIdFromChannel() external {
    string memory channelId = "some-channel";

    uint256 roleId = _randomUint256();
    uint256 roleId2 = _randomUint256();

    _userEntitlement.addRoleIdToChannel(channelId, roleId);

    _userEntitlement.addRoleIdToChannel(channelId, roleId2);
    _userEntitlement.removeRoleIdFromChannel(channelId, roleId2);
  }

  function testRevertIfEntitlementUserNotFound() external {
    uint256 roleId = _randomUint256();
    address nonExistentUser = _randomAddress();

    vm.expectRevert(Errors.EntitlementNotFound.selector);
    _userEntitlement.removeEntitlement(roleId, abi.encode(nonExistentUser));
  }

  function testGetUserRoles() external {
    address _creator = _randomAddress();

    vm.prank(_creator);
    address _space = createSimpleSpace();

    string memory _roleName = "test-role";
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
    address userEntitlement = getSpaceUserEntitlement(_space);

    address[] memory users = new address[](1);
    users[0] = _creator;

    vm.prank(_creator);
    Space(_space).addRoleToEntitlement(
      _roleId,
      DataTypes.Entitlement(userEntitlement, abi.encode(users))
    );

    DataTypes.Role[] memory roles = IEntitlement(userEntitlement).getUserRoles(
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
    _userEntitlement.setEntitlement(roleId, abi.encode(emptyUsers));

    address[] memory invalidUsers = new address[](1);
    invalidUsers[0] = address(0);
    vm.expectRevert(Errors.AddressNotFound.selector);
    _userEntitlement.setEntitlement(roleId, abi.encode(invalidUsers));

    _userEntitlement.setEntitlement(_randomUint256(), abi.encode(users));
    _userEntitlement.setEntitlement(roleId, abi.encode(users));

    _userEntitlement.getEntitlementDataByRoleId(roleId);

    _userEntitlement.removeEntitlement(roleId, abi.encode(users));
  }
}

contract UserEntitlementv2 is UserEntitlement {}
