// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "../utils/TestUtils.sol";

/** Interfaces */
import {IEntitlement} from "contracts/src/spacesv2/interfaces/IEntitlement.sol";

/** Libraries */
import {DataTypes} from "contracts/src/spacesv2/libraries/DataTypes.sol";
import {Permissions} from "contracts/src/spacesv2/libraries/Permissions.sol";

/** Contracts */
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Space} from "contracts/src/spacesv2/Space.sol";
import {SpaceOwner} from "contracts/src/spacesv2/SpaceOwner.sol";
import {SpaceFactory} from "contracts/src/spacesv2/SpaceFactory.sol";
import {UserEntitlement} from "contracts/src/spacesv2/entitlements/UserEntitlement.sol";
import {TokenEntitlement} from "contracts/src/spacesv2/entitlements/TokenEntitlement.sol";

contract BaseSetup is TestUtils {
  SpaceFactory internal spaceFactory;
  Space internal spaceImplementation;
  TokenEntitlement internal tokenImplementation;
  UserEntitlement internal userImplementation;
  SpaceOwner internal spaceToken;

  string[] public initialPermissions;

  function init() internal {
    spaceToken = new SpaceOwner("Space Token", "ZION");
    spaceImplementation = new Space();
    tokenImplementation = new TokenEntitlement();
    userImplementation = new UserEntitlement();
    spaceFactory = new SpaceFactory();

    _createInitialOwnerPermissions();

    address spaceFactoryAddress = address(
      new ERC1967Proxy(
        address(spaceFactory),
        abi.encodeCall(
          spaceFactory.initialize,
          (
            address(spaceImplementation),
            address(tokenImplementation),
            address(userImplementation),
            address(spaceToken),
            initialPermissions
          )
        )
      )
    );

    spaceToken.setFactory(spaceFactoryAddress);
    spaceFactory = SpaceFactory(spaceFactoryAddress);
  }

  function _createInitialOwnerPermissions() internal {
    initialPermissions.push(Permissions.Read);
    initialPermissions.push(Permissions.Write);
    initialPermissions.push(Permissions.Invite);
    initialPermissions.push(Permissions.Redact);
    initialPermissions.push(Permissions.Ban);
    initialPermissions.push(Permissions.Ping);
    initialPermissions.push(Permissions.PinMessage);
    initialPermissions.push(Permissions.ModifyChannelPermissions);
    initialPermissions.push(Permissions.ModifyProfile);
    initialPermissions.push(Permissions.Owner);
    initialPermissions.push(Permissions.AddRemoveChannels);
    initialPermissions.push(Permissions.ModifySpacePermissions);
    initialPermissions.push(Permissions.ModifyChannelDefaults);
  }

  function createSimpleChannel(address _space) internal returns (bytes32) {
    (
      string memory channelName,
      string memory channelNetworkId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();
    return Space(_space).createChannel(channelName, channelNetworkId, roleIds);
  }

  function createSimpleSpace() internal returns (address) {
    DataTypes.CreateSpaceExtraEntitlements memory _entitlementData = DataTypes
      .CreateSpaceExtraEntitlements({
        roleName: "",
        permissions: new string[](0),
        tokens: new DataTypes.ExternalToken[](0),
        users: new address[](0)
      });

    string[] memory _permissions = new string[](0);

    address space = spaceFactory.createSpace(
      "zion",
      "!7evmpuHDDgkady9u:goerli",
      "ipfs://QmZion",
      _permissions,
      _entitlementData
    );

    return space;
  }

  function createSpaceWithEveryonePermissions(
    string[] memory _permissions
  ) internal returns (address) {
    DataTypes.CreateSpaceExtraEntitlements memory _entitlementData = DataTypes
      .CreateSpaceExtraEntitlements({
        roleName: "",
        permissions: new string[](0),
        tokens: new DataTypes.ExternalToken[](0),
        users: new address[](0)
      });

    address space = spaceFactory.createSpace(
      "zion",
      "!7evmpuHDDgkady9u:goerli",
      "ipfs://QmZion",
      _permissions,
      _entitlementData
    );

    return space;
  }

  function createSpaceWithEntitlements(
    DataTypes.CreateSpaceExtraEntitlements memory _entitlementData
  ) internal returns (address) {
    string[] memory _permissions = new string[](0);

    address space = spaceFactory.createSpace(
      "zion",
      "!7evmpuHDDgkady9u:goerli",
      "ipfs://QmZion",
      _permissions,
      _entitlementData
    );

    return space;
  }

  function createSpaceWithModeratorEntitlements()
    internal
    returns (address _space, address _moderator, uint256 _moderatorRoleId)
  {
    _moderator = _randomAddress();

    address[] memory _users = new address[](1);
    _users[0] = _moderator;

    string[] memory _spacePermissions = new string[](1);
    _spacePermissions[0] = Permissions.ModifySpacePermissions;

    DataTypes.CreateSpaceExtraEntitlements memory _entitlementData = DataTypes
      .CreateSpaceExtraEntitlements({
        roleName: "Moderator",
        permissions: _spacePermissions,
        users: _users,
        tokens: new DataTypes.ExternalToken[](0)
      });

    _space = createSpaceWithEntitlements(_entitlementData);

    DataTypes.Role[] memory allRoles = Space(_space).getRoles();

    for (uint256 i = 0; i < allRoles.length; i++) {
      if (keccak256(bytes(allRoles[i].name)) == keccak256(bytes("Moderator"))) {
        _moderatorRoleId = allRoles[i].roleId;
      }
    }
  }

  function _createSimpleChannelData()
    internal
    pure
    returns (
      string memory channelName,
      string memory channelNetworkId,
      uint256[] memory roleIds
    )
  {
    return ("general", "!7evmpuHDDgkady9u:localhost", new uint256[](0));
  }

  function createSimpleRoleWithPermission(
    address _space
  ) internal returns (uint256 _roleId) {
    string memory _roleName = "Member";

    string[] memory _permissions = new string[](1);
    _permissions[0] = "Vote";

    _roleId = Space(_space).createRole(_roleName, _permissions);
  }

  function getSpaceUserEntitlement(
    address _space
  ) internal view returns (address) {
    address[] memory entitlements = Space(_space).getEntitlements();
    address userEntitlement;
    for (uint256 i = 0; i < entitlements.length; i++) {
      if (
        _isEqual(IEntitlement(entitlements[i]).moduleType(), "UserEntitlement")
      ) {
        userEntitlement = entitlements[i];
      }
    }

    return userEntitlement;
  }

  function getSpaceTokenEntitlement(
    address _space
  ) internal view returns (address) {
    address[] memory entitlements = Space(_space).getEntitlements();
    address tokenEntitlement;
    for (uint256 i = 0; i < entitlements.length; i++) {
      if (
        _isEqual(IEntitlement(entitlements[i]).moduleType(), "TokenEntitlement")
      ) {
        tokenEntitlement = entitlements[i];
      }
    }

    return tokenEntitlement;
  }
}
