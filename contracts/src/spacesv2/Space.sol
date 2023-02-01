// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

//interfaces
import {ISpace} from "./interfaces/ISpace.sol";
import {IEntitlement} from "./interfaces/IEntitlement.sol";
import {IERC165} from "openzeppelin-contracts/contracts/utils/introspection/IERC165.sol";

//libraries
import {DataTypes} from "./libraries/DataTypes.sol";
import {Utils} from "./libraries/Utils.sol";
import {Errors} from "./libraries/Errors.sol";
import {Events} from "./libraries/Events.sol";
import {Permissions} from "./libraries/Permissions.sol";

//contracts
import {Initializable} from "openzeppelin-contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {MultiCaller} from "./MultiCaller.sol";

contract Space is
  Initializable,
  OwnableUpgradeable,
  UUPSUpgradeable,
  MultiCaller,
  ISpace
{
  string public name;
  string public networkId;
  bool public disabled;
  uint256 public ownerRoleId;

  mapping(address => bool) public hasEntitlement;
  mapping(address => bool) public defaultEntitlements;
  mapping(uint256 => bytes32[]) internal entitlementIdsByRoleId;
  address[] public entitlements;

  uint256 public roleCount;
  mapping(uint256 => DataTypes.Role) public rolesById;
  mapping(uint256 => bytes32[]) internal permissionsByRoleId;

  mapping(bytes32 => DataTypes.Channel) public channelsByHash;
  bytes32[] public channels;

  modifier onlySpaceOwner() {
    _isAllowed("", Permissions.Owner);
    _;
  }

  /// ***** Space Management *****

  /// @inheritdoc ISpace
  function initialize(
    string memory _name,
    string memory _networkId,
    address[] memory _entitlements
  ) external initializer {
    __UUPSUpgradeable_init();
    __Ownable_init();

    name = _name;
    networkId = _networkId;

    // whitelist modules
    for (uint256 i = 0; i < _entitlements.length; i++) {
      _setEntitlement(_entitlements[i], true);
      defaultEntitlements[_entitlements[i]] = true;
    }
  }

  /// @inheritdoc ISpace
  function setSpaceAccess(bool _disabled) external {
    _isOwner("");
    disabled = _disabled;
  }

  /// @inheritdoc ISpace
  function setOwnerRoleId(uint256 _roleId) external {
    _isAllowed("", Permissions.Owner);

    if (rolesById[_roleId].roleId == 0) {
      revert Errors.RoleDoesNotExist();
    }

    // check if new role id has the owner permission
    bool hasOwnerPermission = false;
    for (uint256 i = 0; i < permissionsByRoleId[_roleId].length; i++) {
      if (
        permissionsByRoleId[_roleId][i] ==
        bytes32(abi.encodePacked(Permissions.Owner))
      ) {
        hasOwnerPermission = true;
        break;
      }
    }

    if (!hasOwnerPermission) {
      revert Errors.MissingOwnerPermission();
    }

    ownerRoleId = _roleId;
  }

  /// ***** Channel Management *****

  /// @inheritdoc ISpace
  function getChannelByHash(
    bytes32 _channelHash
  ) external view returns (DataTypes.Channel memory) {
    return channelsByHash[_channelHash];
  }

  /// @inheritdoc ISpace
  function setChannelAccess(
    string calldata _channelId,
    bool _disabled
  ) external {
    _isAllowed("", Permissions.AddRemoveChannels);

    bytes32 channelId = keccak256(abi.encodePacked(_channelId));

    if (channelsByHash[channelId].channelId == 0) {
      revert Errors.ChannelDoesNotExist();
    }

    channelsByHash[channelId].disabled = _disabled;
  }

  function updateChannel(
    string calldata _channelId,
    string memory _channelName
  ) external {
    _isAllowed("", Permissions.AddRemoveChannels);

    bytes32 channelId = keccak256(abi.encodePacked(_channelId));

    if (channelsByHash[channelId].channelId == 0) {
      revert Errors.ChannelDoesNotExist();
    }

    // verify channelName is not empty
    if (bytes(_channelName).length == 0) {
      revert Errors.NotAllowed();
    }

    channelsByHash[channelId].name = _channelName;
  }

  /// @inheritdoc ISpace
  function createChannel(
    string memory channelName,
    string memory channelNetworkId,
    uint256[] memory roleIds
  ) external returns (bytes32) {
    _isAllowed("", Permissions.AddRemoveChannels);

    bytes32 channelId = keccak256(abi.encodePacked(channelNetworkId));

    if (channelsByHash[channelId].channelId != 0) {
      revert Errors.ChannelAlreadyRegistered();
    }

    // save channel info
    channelsByHash[channelId] = DataTypes.Channel({
      name: channelName,
      channelId: channelId,
      createdAt: block.timestamp,
      disabled: false
    });

    // keep track of channels
    channels.push(channelId);

    // Add the owner role to the channel's entitlements
    for (uint256 i = 0; i < entitlements.length; i++) {
      address entitlement = entitlements[i];

      IEntitlement(entitlement).addRoleIdToChannel(
        channelNetworkId,
        ownerRoleId
      );

      // Add extra roles to the channel's entitlements
      for (uint256 j = 0; j < roleIds.length; j++) {
        if (roleIds[j] == ownerRoleId) continue;

        // make sure the role exists
        if (rolesById[roleIds[j]].roleId == 0) {
          revert Errors.RoleDoesNotExist();
        }

        try
          IEntitlement(entitlement).addRoleIdToChannel(
            channelNetworkId,
            roleIds[j]
          )
        {} catch {
          revert Errors.AddRoleFailed();
        }
      }
    }

    return channelId;
  }

  /// ***** Role Management *****

  /// @inheritdoc ISpace
  function getRoles() external view returns (DataTypes.Role[] memory) {
    DataTypes.Role[] memory roles = new DataTypes.Role[](roleCount);
    for (uint256 i = 0; i < roleCount; i++) {
      roles[i] = rolesById[i + 1];
    }
    return roles;
  }

  /// @inheritdoc ISpace
  function createRole(
    string memory _roleName,
    string[] memory _permissions,
    DataTypes.Entitlement[] memory _entitlements
  ) external returns (uint256) {
    _isAllowed("", Permissions.ModifySpacePermissions);

    uint256 newRoleId = ++roleCount;

    DataTypes.Role memory role = DataTypes.Role(newRoleId, _roleName);
    rolesById[newRoleId] = role;

    for (uint256 i = 0; i < _permissions.length; i++) {
      // only allow contract owner to add permission owner to role
      if (
        _msgSender() != owner() &&
        Utils.isEqual(_permissions[i], Permissions.Owner)
      ) {
        revert Errors.OwnerPermissionNotAllowed();
      }

      bytes32 _permission = bytes32(abi.encodePacked(_permissions[i]));
      permissionsByRoleId[newRoleId].push(_permission);
    }

    // loop through entitlements and set entitlement data for role
    for (uint256 i = 0; i < _entitlements.length; i++) {
      address _entitlement = _entitlements[i].module;
      bytes memory _entitlementData = _entitlements[i].data;

      // check for empty address or data
      if (_entitlement == address(0) || _entitlementData.length == 0) {
        continue;
      }

      // check if entitlement is valid
      if (hasEntitlement[_entitlement] == false) {
        revert Errors.EntitlementNotWhitelisted();
      }

      // set entitlement data for role
      _addRoleToEntitlement(newRoleId, _entitlement, _entitlementData);
    }

    emit Events.RoleCreated(_msgSender(), newRoleId, _roleName, networkId);

    return newRoleId;
  }

  /// @inheritdoc ISpace
  function updateRole(uint256 _roleId, string memory _roleName) external {
    _isAllowed("", Permissions.ModifySpacePermissions);

    // check not renaming owner role
    if (_roleId == ownerRoleId) {
      revert Errors.NotAllowed();
    }

    // check if role exists
    if (rolesById[_roleId].roleId == 0) {
      revert Errors.RoleDoesNotExist();
    }

    if (bytes(_roleName).length == 0) {
      revert Errors.InvalidParameters();
    }

    rolesById[_roleId].name = _roleName;

    emit Events.RoleUpdated(_msgSender(), _roleId, _roleName, networkId);
  }

  /// @inheritdoc ISpace
  function removeRole(uint256 _roleId) external {
    _isAllowed("", Permissions.ModifySpacePermissions);

    // check not removing owner role
    if (_roleId == ownerRoleId) {
      revert Errors.NotAllowed();
    }

    // check if role exists
    if (rolesById[_roleId].roleId == 0) {
      revert Errors.RoleDoesNotExist();
    }

    // check if role is used in entitlements
    if (entitlementIdsByRoleId[_roleId].length > 0) {
      revert Errors.RoleIsAssignedToEntitlement();
    }

    // delete role
    delete rolesById[_roleId];

    // delete permissions of role
    delete permissionsByRoleId[_roleId];

    emit Events.RoleRemoved(_msgSender(), _roleId, networkId);
  }

  /// @inheritdoc ISpace
  function getRoleById(
    uint256 _roleId
  ) external view returns (DataTypes.Role memory) {
    return rolesById[_roleId];
  }

  /// @inheritdoc ISpace
  function addPermissionToRole(
    uint256 _roleId,
    string memory _permission
  ) external {
    _isAllowed("", Permissions.ModifySpacePermissions);

    // cannot add owner permission to role
    if (Utils.isEqual(_permission, Permissions.Owner)) {
      revert Errors.NotAllowed();
    }

    // check if role exists
    if (rolesById[_roleId].roleId == 0) {
      revert Errors.RoleDoesNotExist();
    }

    bytes32 _permissionHash = bytes32(abi.encodePacked(_permission));

    // check if permission already exists
    for (uint256 i = 0; i < permissionsByRoleId[_roleId].length; i++) {
      if (permissionsByRoleId[_roleId][i] == _permissionHash) {
        revert Errors.PermissionAlreadyExists();
      }
    }

    // add permission to role
    permissionsByRoleId[_roleId].push(_permissionHash);
  }

  /// @inheritdoc ISpace
  function getPermissionsByRoleId(
    uint256 _roleId
  ) external view override returns (bytes32[] memory) {
    return permissionsByRoleId[_roleId];
  }

  /// @inheritdoc ISpace
  function removePermissionFromRole(
    uint256 _roleId,
    string memory _permission
  ) external {
    _isAllowed("", Permissions.ModifySpacePermissions);

    if (Utils.isEqual(_permission, Permissions.Owner)) {
      revert Errors.NotAllowed();
    }

    // check if role exists
    if (rolesById[_roleId].roleId == 0) {
      revert Errors.RoleDoesNotExist();
    }

    bytes32 _permissionHash = bytes32(abi.encodePacked(_permission));

    // check if permission exists
    for (uint256 i = 0; i < permissionsByRoleId[_roleId].length; i++) {
      if (permissionsByRoleId[_roleId][i] != _permissionHash) continue;

      // remove permission from role
      permissionsByRoleId[_roleId][i] = permissionsByRoleId[_roleId][
        permissionsByRoleId[_roleId].length - 1
      ];
      permissionsByRoleId[_roleId].pop();
      return;
    }
  }

  /// ***** Entitlement Management *****

  /// @inheritdoc ISpace
  function getEntitlementIdsByRoleId(
    uint256 _roleId
  ) external view returns (bytes32[] memory) {
    return entitlementIdsByRoleId[_roleId];
  }

  /// @inheritdoc ISpace
  function isEntitledToChannel(
    string calldata _channelId,
    address _user,
    string calldata _permission
  ) external view returns (bool _entitled) {
    // check that a _channelId is not empty
    if (bytes(_channelId).length == 0) {
      revert Errors.InvalidParameters();
    }

    for (uint256 i = 0; i < entitlements.length; i++) {
      if (
        _isEntitled(_channelId, _user, bytes32(abi.encodePacked(_permission)))
      ) {
        _entitled = true;
      }
    }
  }

  /// @inheritdoc ISpace
  function isEntitledToSpace(
    address _user,
    string calldata _permission
  ) external view returns (bool _entitled) {
    for (uint256 i = 0; i < entitlements.length; i++) {
      if (_isEntitled("", _user, bytes32(abi.encodePacked(_permission)))) {
        _entitled = true;
      }
    }
  }

  /// @inheritdoc ISpace
  function getEntitlements() external view returns (address[] memory) {
    return entitlements;
  }

  /// @inheritdoc ISpace
  function setEntitlement(address _entitlement, bool _whitelist) external {
    _isAllowed("", Permissions.ModifySpacePermissions);

    // validate entitlement interface
    _validateEntitlementInterface(_entitlement);

    // check if entitlement already exists
    if (_whitelist && hasEntitlement[_entitlement]) {
      revert Errors.EntitlementAlreadyWhitelisted();
    }

    // check if removing a default entitlement
    if (!_whitelist && defaultEntitlements[_entitlement]) {
      revert Errors.NotAllowed();
    }

    _setEntitlement(_entitlement, _whitelist);
  }

  /// @inheritdoc ISpace
  function removeRoleFromEntitlement(
    uint256 _roleId,
    DataTypes.Entitlement calldata _entitlement
  ) external {
    _isAllowed("", Permissions.ModifySpacePermissions);

    // check not removing owner role
    if (_roleId == ownerRoleId) {
      revert Errors.NotAllowed();
    }

    // check if entitlement is whitelisted
    if (!hasEntitlement[_entitlement.module]) {
      revert Errors.EntitlementNotWhitelisted();
    }

    // check roleid exists
    if (rolesById[_roleId].roleId == 0) {
      revert Errors.RoleDoesNotExist();
    }

    // create entitlement id
    bytes32 entitlementId = keccak256(
      abi.encodePacked(_roleId, _entitlement.data)
    );

    // remove entitlementId from entitlementIdsByRoleId
    bytes32[] storage entitlementIds = entitlementIdsByRoleId[_roleId];
    for (uint256 i = 0; i < entitlementIds.length; i++) {
      if (entitlementId != entitlementIds[i]) continue;

      entitlementIds[i] = entitlementIds[entitlementIds.length - 1];
      entitlementIds.pop();
      break;
    }

    IEntitlement(_entitlement.module).removeEntitlement(
      _roleId,
      _entitlement.data
    );
  }

  /// @inheritdoc ISpace
  function addRoleToEntitlement(
    uint256 _roleId,
    DataTypes.Entitlement memory _entitlement
  ) external {
    _isAllowed("", Permissions.ModifySpacePermissions);

    if (!hasEntitlement[_entitlement.module]) {
      revert Errors.EntitlementNotWhitelisted();
    }

    // check that role id exists
    if (rolesById[_roleId].roleId == 0) {
      revert Errors.RoleDoesNotExist();
    }

    _addRoleToEntitlement(_roleId, _entitlement.module, _entitlement.data);
  }

  /// @inheritdoc ISpace
  function addRoleToChannel(
    string calldata _channelId,
    address _entitlement,
    uint256 _roleId
  ) external {
    _isAllowed(_channelId, Permissions.ModifySpacePermissions);

    if (!hasEntitlement[_entitlement]) {
      revert Errors.EntitlementNotWhitelisted();
    }

    // check that role id exists
    if (rolesById[_roleId].roleId == 0) {
      revert Errors.RoleDoesNotExist();
    }

    IEntitlement(_entitlement).addRoleIdToChannel(_channelId, _roleId);
  }

  /// @inheritdoc ISpace
  function removeRoleFromChannel(
    string calldata _channelId,
    address _entitlement,
    uint256 _roleId
  ) external {
    _isAllowed(_channelId, Permissions.ModifySpacePermissions);

    if (!hasEntitlement[_entitlement]) {
      revert Errors.EntitlementNotWhitelisted();
    }

    // check that role id exists
    if (rolesById[_roleId].roleId == 0) {
      revert Errors.RoleDoesNotExist();
    }

    IEntitlement(_entitlement).removeRoleIdFromChannel(_channelId, _roleId);
  }

  /// ***** Internal *****
  function _addRoleToEntitlement(
    uint256 _roleId,
    address _entitlement,
    bytes memory _entitlementData
  ) internal {
    bytes32 entitlementId = keccak256(
      abi.encodePacked(_roleId, _entitlementData)
    );

    // check that entitlementId does not already exist
    // this is to prevent duplicate entries
    // but could lead to wanting to use the same entitlement data and role id
    // on different entitlement contracts
    bytes32[] memory entitlementIds = entitlementIdsByRoleId[_roleId];
    for (uint256 i = 0; i < entitlementIds.length; i++) {
      if (entitlementIds[i] == entitlementId) {
        revert Errors.EntitlementAlreadyExists();
      }
    }

    // keep track of which entitlements are associated with a role
    entitlementIdsByRoleId[_roleId].push(entitlementId);

    IEntitlement(_entitlement).setEntitlement(_roleId, _entitlementData);
  }

  function _isOwner(string memory _channelId) internal view {
    if (
      _isEntitled(_channelId, _msgSender(), bytes32(abi.encodePacked("Owner")))
    ) {
      return;
    } else {
      revert Errors.NotAllowed();
    }
  }

  function _isAllowed(
    string memory _channelId,
    string memory _permission
  ) internal view {
    if (
      _msgSender() == owner() ||
      (!disabled &&
        _isEntitled(
          _channelId,
          _msgSender(),
          bytes32(abi.encodePacked(_permission))
        ))
    ) {
      return;
    } else {
      revert Errors.NotAllowed();
    }
  }

  function _setEntitlement(address _entitlement, bool _whitelist) internal {
    // set entitlement on mapping
    hasEntitlement[_entitlement] = _whitelist;

    // if user wants to whitelist, add to entitlements array
    if (_whitelist) {
      entitlements.push(_entitlement);
    } else {
      // remove from entitlements array
      for (uint256 i = 0; i < entitlements.length; i++) {
        if (_entitlement != entitlements[i]) continue;
        entitlements[i] = entitlements[entitlements.length - 1];
        entitlements.pop();
        break;
      }
    }
  }

  function _isEntitled(
    string memory _channelId,
    address _user,
    bytes32 _permission
  ) internal view returns (bool _entitled) {
    for (uint256 i = 0; i < entitlements.length; i++) {
      if (
        IEntitlement(entitlements[i]).isEntitled(_channelId, _user, _permission)
      ) {
        _entitled = true;
      }
    }
  }

  function _validateEntitlementInterface(
    address entitlementAddress
  ) internal view {
    if (
      IERC165(entitlementAddress).supportsInterface(
        type(IEntitlement).interfaceId
      ) == false
    ) revert Errors.EntitlementModuleNotSupported();
  }

  function _authorizeUpgrade(
    address newImplementation
  ) internal override onlySpaceOwner {}
}
