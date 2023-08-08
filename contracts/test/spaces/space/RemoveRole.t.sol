// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spaces/libraries/Errors.sol";
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";

import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {Space} from "contracts/src/spaces/Space.sol";

contract RemoveRoleTest is SpaceBaseSetup {
  function setUp() external {}

  function testRemoveRole() external {
    address _moderator = _randomAddress();

    address[] memory _users = new address[](1);
    _users[0] = _moderator;

    string[] memory _spacePermissions = new string[](1);
    _spacePermissions[0] = Permissions.ModifySpaceSettings;

    DataTypes.CreateSpaceExtraEntitlements memory _entitlementData = DataTypes
      .CreateSpaceExtraEntitlements({
        roleName: "moderator",
        permissions: _spacePermissions,
        users: _users,
        tokens: new DataTypes.ExternalToken[](0)
      });

    address _space = createSpaceWithEntitlements(_entitlementData);

    assertTrue(
      Space(_space).isEntitledToSpace(
        _moderator,
        Permissions.ModifySpaceSettings
      )
    );

    DataTypes.Role[] memory allRoles = Space(_space).getRoles();
    uint256 moderatorRoleId;

    for (uint256 i = 0; i < allRoles.length; i++) {
      if (keccak256(bytes(allRoles[i].name)) == keccak256(bytes("moderator"))) {
        moderatorRoleId = allRoles[i].roleId;
      }
    }

    address _userEntitlement = getSpaceUserEntitlement(_space);

    // Revert since role is assigned to entitlement
    vm.expectRevert(Errors.RoleIsAssignedToEntitlement.selector);
    Space(_space).removeRole(moderatorRoleId);

    DataTypes.Entitlement memory _entitlement;
    _entitlement.module = _userEntitlement;

    address[] memory _moderators = new address[](1);
    _moderators[0] = _moderator;

    _entitlement.data = abi.encode(_moderators);

    // Remove role from entitlement
    Space(_space).removeRoleFromEntitlement(moderatorRoleId, _entitlement);

    // Remove role from space
    Space(_space).removeRole(moderatorRoleId);

    assertFalse(
      Space(_space).isEntitledToSpace(
        _moderator,
        Permissions.ModifySpaceSettings
      )
    );
  }

  function testRemoveNonExistentRole() external {
    address _space = createSimpleSpace();

    vm.expectRevert(Errors.RoleDoesNotExist.selector);
    Space(_space).removeRole(100);
  }

  function testRemoveRoleOwnerPermissionNotAllowed() external {
    address _moderator = _randomAddress();

    address[] memory _users = new address[](1);
    _users[0] = _moderator;

    string[] memory _spacePermissions = new string[](1);
    _spacePermissions[0] = Permissions.ModifySpaceSettings;

    DataTypes.CreateSpaceExtraEntitlements memory _entitlementData = DataTypes
      .CreateSpaceExtraEntitlements({
        roleName: "moderator",
        permissions: _spacePermissions,
        users: _users,
        tokens: new DataTypes.ExternalToken[](0)
      });

    address _space = createSpaceWithEntitlements(_entitlementData);

    assertTrue(
      Space(_space).isEntitledToSpace(
        _moderator,
        Permissions.ModifySpaceSettings
      )
    );

    uint256 ownerRoleId = Space(_space).ownerRoleId();

    vm.prank(_moderator);
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).removeRole(ownerRoleId);
  }

  function testAddNewEntitlementToOwnerRole() external {
    address _notTokenHolder = _randomAddress();
    address _tokenHolder = _randomAddress();

    // create space with _tokenHolder as owner
    vm.prank(_tokenHolder);
    address _space = createSimpleSpace();
    DataTypes.EntitlementModule memory _userEntitlementModule = Space(_space)
      .getEntitlementModules()[1];

    // Create entitlement with modify space permissions
    address[] memory _users = new address[](1);
    _users[0] = _notTokenHolder;
    DataTypes.Entitlement[]
      memory _newEntitlementsI = new DataTypes.Entitlement[](1);
    string[] memory _spacePermissions = new string[](1);
    _spacePermissions[0] = Permissions.ModifySpaceSettings;
    _newEntitlementsI[0] = DataTypes.Entitlement({
      module: _userEntitlementModule.moduleAddress,
      data: abi.encode(_users)
    });

    // add to system for _notTokenHOlder
    vm.prank(_tokenHolder);
    Space(_space).createRole(
      "ModifySpaceSettings",
      _spacePermissions,
      _newEntitlementsI
    );

    // see that "ModifySpaceSettings" was granted
    assertTrue(
      Space(_space).isEntitledToSpace(
        _notTokenHolder,
        Permissions.ModifySpaceSettings
      )
    );

    // grab owner role
    uint256 ownerRoleId = Space(_space).ownerRoleId();

    // create entitlement for _notTokenHolder
    DataTypes.Entitlement memory _newEntitlementII = DataTypes.Entitlement({
      module: _userEntitlementModule.moduleAddress,
      data: abi.encode(_users)
    });

    // See _notTokenHolder does not have owner permissions
    assertFalse(
      Space(_space).isEntitledToSpace(_notTokenHolder, Permissions.Owner)
    );

    // Have _notTokenHolder elevate themselves to owner by adding themself to owner role
    vm.prank(_notTokenHolder);
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).addRoleToEntitlement(ownerRoleId, _newEntitlementII);

    // See _notTokenHolder does not have owner permissions
    assertFalse(
      Space(_space).isEntitledToSpace(_notTokenHolder, Permissions.Owner)
    );
  }

  function testHaveMultipleOwners() external {
    address _notTokenHolder = _randomAddress();
    address _tokenHolder = _randomAddress();

    vm.prank(_tokenHolder);
    address _space = createSimpleSpace();
    DataTypes.EntitlementModule memory _userEntitlementModule = Space(_space)
      .getEntitlementModules()[1];

    // see that original token holder has owner rights
    assertTrue(
      Space(_space).isEntitledToSpace(_tokenHolder, Permissions.Owner)
    );

    // Create entitlement with owner permissions
    address[] memory _users = new address[](1);
    _users[0] = _notTokenHolder;
    DataTypes.Entitlement[]
      memory _newOwnerEntitlements = new DataTypes.Entitlement[](1);
    string[] memory _spacePermissions = new string[](2);
    _spacePermissions[0] = Permissions.Owner;
    _spacePermissions[1] = Permissions.ModifySpaceSettings;
    _newOwnerEntitlements[0] = DataTypes.Entitlement({
      module: _userEntitlementModule.moduleAddress,
      data: abi.encode(_users)
    });

    // add to system
    vm.prank(_tokenHolder);
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).createRole(
      "OwnerII",
      _spacePermissions,
      _newOwnerEntitlements
    );

    // see that "OwnerII" has ownership rights
    assertFalse(
      Space(_space).isEntitledToSpace(_notTokenHolder, Permissions.Owner)
    );
  }

  function testChannelDisabledDoesNotGate() external {
    address _channelAccessor = _randomAddress();
    address _tokenHolder = _randomAddress();

    // create space with _tokenHolder as owner
    vm.prank(_tokenHolder);
    address _space = createSimpleSpace();
    DataTypes.EntitlementModule memory _userEntitlementModule = Space(_space)
      .getEntitlementModules()[1];

    // Create entitlement with channel read permissions
    address[] memory _users = new address[](1);
    _users[0] = _channelAccessor;
    DataTypes.Entitlement[]
      memory _newEntitlementsI = new DataTypes.Entitlement[](1);
    string[] memory _spacePermissions = new string[](1);
    _spacePermissions[0] = Permissions.Read;
    _newEntitlementsI[0] = DataTypes.Entitlement({
      module: _userEntitlementModule.moduleAddress,
      data: abi.encode(_users)
    });

    // add to system for _channelAccessor
    vm.prank(_tokenHolder);
    uint256 readRoleID = Space(_space).createRole(
      "Read",
      _spacePermissions,
      _newEntitlementsI
    );

    // create channel and add role to it
    (
      string memory channelName,
      string memory channelId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();
    vm.prank(_tokenHolder);
    Space(_space).createChannel(channelName, channelId, roleIds);
    vm.prank(_tokenHolder);
    Space(_space).addRoleToChannel(
      channelId,
      _userEntitlementModule.moduleAddress,
      readRoleID
    );

    // see that "Read" is active
    assertTrue(
      Space(_space).isEntitledToChannel(
        channelId,
        _channelAccessor,
        Permissions.Read
      )
    );

    // deactivate channel
    vm.prank(_tokenHolder);
    Space(_space).setChannelAccess(channelId, true);

    // see that "Read" is still active
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).isEntitledToChannel(
      channelId,
      _channelAccessor,
      Permissions.Read
    );
  }
}
