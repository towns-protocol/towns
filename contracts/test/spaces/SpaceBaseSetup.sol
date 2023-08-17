// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {TestUtils} from "contracts/test/utils/TestUtils.sol";

/** Interfaces */
import {IEntitlement} from "contracts/src/spaces/interfaces/IEntitlement.sol";
import {ERC721Holder} from "openzeppelin-contracts/contracts/token/ERC721/utils/ERC721Holder.sol";

/** Libraries */
import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";

/** Contracts */
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Space} from "contracts/src/spaces/Space.sol";
import {TownOwnerV1} from "contracts/src/tokens/TownOwnerV1.sol";
import {SpaceFactory} from "contracts/src/spaces/SpaceFactory.sol";
import {Pioneer} from "contracts/src/tokens/Pioneer.sol";
import {UserEntitlement} from "contracts/src/spaces/entitlements/UserEntitlement.sol";
import {TokenEntitlement} from "contracts/src/spaces/entitlements/TokenEntitlement.sol";
import {SpaceUpgrades} from "contracts/src/spaces/SpaceUpgrades.sol";

contract SpaceBaseSetup is TestUtils, ERC721Holder {
  SpaceFactory public spaceFactory;
  Space public spaceImplementation;
  TokenEntitlement public tokenImplementation;
  UserEntitlement public userImplementation;
  TownOwnerV1 public spaceToken;
  Pioneer public pioneer;
  SpaceUpgrades public spaceUpgrades;
  string[] public initialPermissions;
  uint256 public upgradeDelayPeriod = block.timestamp;

  // to receive eth from pioneer contract
  receive() external payable {}

  constructor() {
    pioneer = new Pioneer("Pioneer", "PNR", "");
    spaceToken = new TownOwnerV1("Town Owner", "SPACE", address(this), 0);
    spaceImplementation = new Space();
    tokenImplementation = new TokenEntitlement();
    userImplementation = new UserEntitlement();
    spaceFactory = new SpaceFactory();
    spaceUpgrades = new SpaceUpgrades();

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
            address(pioneer),
            initialPermissions
          )
        )
      )
    );

    spaceToken.setFactory(spaceFactoryAddress);

    // add eth to pioneer contract
    vm.deal(address(pioneer), 1 ether);

    spaceFactory = SpaceFactory(spaceFactoryAddress);

    // start space upgrades
    address spaceUpgradesAddress = address(
      new ERC1967Proxy(
        address(spaceUpgrades),
        abi.encodeCall(
          spaceUpgrades.initialize,
          (address(spaceFactory), upgradeDelayPeriod)
        )
      )
    );

    spaceUpgrades = SpaceUpgrades(spaceUpgradesAddress);

    spaceFactory.setPaused(true);
    spaceFactory.updateImplementations(
      address(0),
      address(0),
      address(0),
      address(0),
      address(spaceUpgrades)
    );
    spaceFactory.setPaused(false);
  }

  function _createInitialOwnerPermissions() internal {
    initialPermissions.push(Permissions.Read);
    initialPermissions.push(Permissions.Write);
    initialPermissions.push(Permissions.Invite);
    initialPermissions.push(Permissions.Redact);
    initialPermissions.push(Permissions.Ban);
    initialPermissions.push(Permissions.Ping);
    initialPermissions.push(Permissions.PinMessage);
    initialPermissions.push(Permissions.Owner);
    initialPermissions.push(Permissions.AddRemoveChannels);
    initialPermissions.push(Permissions.ModifySpaceSettings);
    initialPermissions.push(Permissions.Upgrade);
  }

  function createSimpleChannel(address _space) public returns (bytes32) {
    (
      string memory channelName,
      string memory channelId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();
    return Space(_space).createChannel(channelName, channelId, roleIds);
  }

  function createFuzzySpace(
    string memory _spaceName,
    string memory _spaceNetworkId,
    string memory _spaceMetadata,
    string memory _channelName,
    string memory _channelId
  ) public returns (address) {
    DataTypes.CreateSpaceExtraEntitlements memory _entitlementData = DataTypes
      .CreateSpaceExtraEntitlements({
        roleName: "",
        permissions: new string[](0),
        tokens: new DataTypes.ExternalToken[](0),
        users: new address[](0)
      });

    string[] memory _permissions = new string[](0);

    address space = spaceFactory.createSpace(
      DataTypes.CreateSpaceData(
        _spaceName,
        _spaceNetworkId,
        _spaceMetadata,
        _channelName,
        _channelId
      ),
      _permissions,
      _entitlementData
    );

    return space;
  }

  function createSimpleSpace() public returns (address) {
    DataTypes.CreateSpaceExtraEntitlements memory _entitlementData = DataTypes
      .CreateSpaceExtraEntitlements({
        roleName: "",
        permissions: new string[](0),
        tokens: new DataTypes.ExternalToken[](0),
        users: new address[](0)
      });

    string[] memory _permissions = new string[](0);
    address space = spaceFactory.createSpace(
      DataTypes.CreateSpaceData(
        "zion",
        "!7evmpuHDDgkady9u:goerli",
        "ipfs://QmZion",
        "general",
        "!8evmpuHDDgkady6u:goerli"
      ),
      _permissions,
      _entitlementData
    );

    return space;
  }

  function createSpaceWithEveryonePermissions(
    string[] memory _permissions
  ) public returns (address) {
    DataTypes.CreateSpaceExtraEntitlements memory _entitlementData = DataTypes
      .CreateSpaceExtraEntitlements({
        roleName: "",
        permissions: new string[](0),
        tokens: new DataTypes.ExternalToken[](0),
        users: new address[](0)
      });

    address space = spaceFactory.createSpace(
      DataTypes.CreateSpaceData(
        "zion",
        "!7evmpuHDDgkady9u:goerli",
        "ipfs://QmZion",
        "general",
        "!8evmpuHDDgkady6u:goerli"
      ),
      _permissions,
      _entitlementData
    );

    return space;
  }

  function createSpaceWithEntitlements(
    DataTypes.CreateSpaceExtraEntitlements memory _entitlementData
  ) public returns (address) {
    string[] memory _permissions = new string[](0);

    address space = spaceFactory.createSpace(
      DataTypes.CreateSpaceData(
        "zion",
        "!7evmpuHDDgkady9u:goerli",
        "ipfs://QmZion",
        "general",
        "!8evmpuHDDgkady6u:goerli"
      ),
      _permissions,
      _entitlementData
    );

    return space;
  }

  function createSpaceWithModeratorEntitlements()
    public
    returns (address _space, address _moderator, uint256 _moderatorRoleId)
  {
    _moderator = _randomAddress();

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

    _space = createSpaceWithEntitlements(_entitlementData);

    DataTypes.Role[] memory allRoles = Space(_space).getRoles();

    for (uint256 i = 0; i < allRoles.length; i++) {
      if (keccak256(bytes(allRoles[i].name)) == keccak256(bytes("moderator"))) {
        _moderatorRoleId = allRoles[i].roleId;
      }
    }
  }

  function _createSimpleChannelData()
    internal
    pure
    returns (
      string memory channelName,
      string memory channelId,
      uint256[] memory roleIds
    )
  {
    return ("general", "!7evmpuHDDgkady9u:localhost", new uint256[](0));
  }

  function createSimpleRoleWithPermission(
    address _space
  ) public returns (uint256 _roleId) {
    string memory _roleName = "member";

    string[] memory _permissions = new string[](1);
    _permissions[0] = "vote";

    DataTypes.Entitlement[] memory _entitlements = new DataTypes.Entitlement[](
      1
    );
    _entitlements[0] = DataTypes.Entitlement({module: address(0), data: ""});

    _roleId = Space(_space).createRole(_roleName, _permissions, _entitlements);
  }

  function getSpaceUserEntitlement(
    address _space
  ) public view returns (address) {
    DataTypes.EntitlementModule[] memory entitlements = Space(_space)
      .getEntitlementModules();

    address userEntitlement;
    for (uint256 i = 0; i < entitlements.length; i++) {
      if (_isEqual(entitlements[i].moduleType, "UserEntitlement")) {
        userEntitlement = entitlements[i].moduleAddress;
      }
    }

    return userEntitlement;
  }

  function getSpaceTokenEntitlement(
    address _space
  ) public view returns (address) {
    DataTypes.EntitlementModule[] memory entitlements = Space(_space)
      .getEntitlementModules();

    address tokenEntitlement;
    for (uint256 i = 0; i < entitlements.length; i++) {
      if (_isEqual(entitlements[i].moduleType, "TokenEntitlement")) {
        tokenEntitlement = entitlements[i].moduleAddress;
      }
    }

    return tokenEntitlement;
  }
}
