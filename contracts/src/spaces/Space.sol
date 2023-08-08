// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

//interfaces
import {IERC165} from "openzeppelin-contracts/contracts/utils/introspection/IERC165.sol";
import {IERC721} from "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import {IEntitlement} from "./interfaces/IEntitlement.sol";
import {ISpace} from "./interfaces/ISpace.sol";

//libraries
import {Permissions} from "./libraries/Permissions.sol";
import {DataTypes} from "./libraries/DataTypes.sol";
import {Utils} from "./libraries/Utils.sol";
import {Errors} from "./libraries/Errors.sol";
import {Events} from "./libraries/Events.sol";

//contracts
import {ContextUpgradeable} from "openzeppelin-contracts-upgradeable/utils/ContextUpgradeable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "openzeppelin-contracts-upgradeable/proxy/utils/Initializable.sol";
import {MultiCaller} from "contracts/src/utils/MultiCaller.sol";
import {Metadata} from "contracts/src/utils/Metadata.sol";

contract Space is
  Initializable,
  ContextUpgradeable,
  UUPSUpgradeable,
  MultiCaller,
  Metadata,
  ISpace
{
  string public name;
  string public networkId;
  bool public disabled;
  uint256 public ownerRoleId;
  address public token;
  uint256 public tokenId;

  mapping(address => bool) public hasEntitlement;
  mapping(address => bool) public defaultEntitlements;
  mapping(uint256 => bytes32[]) internal _entitlementIdsByRoleId;
  address[] public entitlements;

  uint256 public roleCount;
  mapping(uint256 => DataTypes.Role) public rolesById;
  mapping(uint256 => bytes32[]) internal _permissionsByRoleId;

  mapping(bytes32 => DataTypes.Channel) public channelsByHash;
  bytes32[] public channels;

  string internal constant _IN_SPACE = "";
  string public constant MODULE_TYPE = "Space";
  uint48 public constant MODULE_VERSION = 1;

  modifier onlySpaceOwner() {
    _verifyPermission(_IN_SPACE, Permissions.Owner);
    _;
  }

  /// ***** Space Management *****

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  /// @inheritdoc ISpace
  function contractType() external pure virtual override returns (bytes32) {
    return bytes32("Space");
  }

  /// @inheritdoc ISpace
  function contractVersion() external pure virtual override returns (uint8) {
    return uint8(MODULE_VERSION);
  }

  /// @inheritdoc ISpace
  function initialize(
    string memory _name,
    string memory _networkId,
    address _token,
    uint256 _tokenId,
    address[] memory _entitlements
  ) external initializer {
    __UUPSUpgradeable_init();
    __Context_init();

    name = _name;
    networkId = _networkId;
    token = _token;
    tokenId = _tokenId;

    // whitelist modules
    for (uint256 i = 0; i < _entitlements.length; i++) {
      _setEntitlement(_entitlements[i], true);
      defaultEntitlements[_entitlements[i]] = true;
    }
  }

  /// @inheritdoc ISpace
  function owner() public view returns (address) {
    return IERC721(token).ownerOf(tokenId);
  }

  /// @inheritdoc ISpace
  function setSpaceAccess(bool _disabled) external {
    if (!_isOwner()) revert Errors.NotAllowed();
    disabled = _disabled;
  }

  /// @inheritdoc ISpace
  function setOwnerRoleId(uint256 _roleId) external {
    if (!_isOwner()) revert Errors.NotAllowed();
    if (_ownerRoleIsSet()) revert Errors.NotAllowed();

    if (rolesById[_roleId].roleId == 0) {
      revert Errors.RoleDoesNotExist();
    }

    // check the role has the owner permission
    bool hasOwnerPermission = false;
    for (uint256 i = 0; i < _permissionsByRoleId[_roleId].length; i++) {
      if (
        _permissionsByRoleId[_roleId][i] ==
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

  /// @inheritdoc ISpace
  function getSpaceInfo() external view returns (SpaceInfo memory spaceInfo) {
    spaceInfo = SpaceInfo({
      spaceAddress: address(this),
      owner: IERC721(token).ownerOf(tokenId),
      spaceId: networkId,
      disabled: disabled
    });
  }

  /// ***** Channel Management *****

  /// @inheritdoc ISpace
  function getChannelByHash(
    bytes32 _channelHash
  ) external view returns (DataTypes.Channel memory) {
    return channelsByHash[_channelHash];
  }

  /// @inheritdoc ISpace
  function getChannelInfo(
    string calldata channelId
  ) external view returns (ChannelInfo memory channelInfo) {
    bytes32 channelHash = keccak256(abi.encodePacked(channelId));

    channelInfo = ChannelInfo({
      channelHash: channelHash,
      channelId: channelId,
      name: channelsByHash[channelHash].name,
      disabled: channelsByHash[channelHash].disabled
    });
  }

  /// @inheritdoc ISpace
  function setChannelAccess(
    string calldata channelId,
    bool disableChannel
  ) external {
    _verifyPermission(_IN_SPACE, Permissions.AddRemoveChannels);

    bytes32 channelHash = keccak256(abi.encodePacked(channelId));

    if (channelsByHash[channelHash].channelHash == 0) {
      revert Errors.ChannelDoesNotExist();
    }

    channelsByHash[channelHash].disabled = disableChannel;
  }

  function updateChannel(
    string calldata channelId,
    string calldata channelName
  ) external {
    _verifyPermission(_IN_SPACE, Permissions.AddRemoveChannels);

    Utils.validateLength(channelName);

    bytes32 channelHash = keccak256(abi.encodePacked(channelId));

    if (channelsByHash[channelHash].channelHash == 0) {
      revert Errors.ChannelDoesNotExist();
    }

    channelsByHash[channelHash].name = channelName;
  }

  /// @inheritdoc ISpace
  function createChannel(
    string calldata channelName,
    string memory channelId,
    uint256[] memory roleIds
  ) external returns (bytes32) {
    _verifyPermission(_IN_SPACE, Permissions.AddRemoveChannels);

    Utils.validateLength(channelName);

    bytes32 channelHash = keccak256(abi.encodePacked(channelId));

    if (channelsByHash[channelHash].channelHash != 0) {
      revert Errors.ChannelAlreadyRegistered();
    }

    // save channel info
    channelsByHash[channelHash] = DataTypes.Channel({
      name: channelName,
      channelId: channelId,
      channelHash: channelHash,
      createdAt: block.timestamp,
      disabled: false
    });

    // keep track of channels
    channels.push(channelHash);

    // Add the owner role to the channel's entitlements
    for (uint256 i = 0; i < entitlements.length; i++) {
      address entitlement = entitlements[i];

      IEntitlement(entitlement).addRoleIdToChannel(channelId, ownerRoleId);

      // Add extra roles to the channel's entitlements
      for (uint256 j = 0; j < roleIds.length; j++) {
        if (roleIds[j] == ownerRoleId) continue;

        // make sure the role exists
        if (rolesById[roleIds[j]].roleId == 0) {
          revert Errors.RoleDoesNotExist();
        }

        try
          IEntitlement(entitlement).addRoleIdToChannel(channelId, roleIds[j])
        {} catch {
          revert Errors.AddRoleFailed();
        }
      }
    }

    return channelHash;
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
    string calldata _roleName,
    string[] memory _permissions,
    DataTypes.Entitlement[] memory _entitlements
  ) external returns (uint256) {
    _verifyPermission(_IN_SPACE, Permissions.ModifySpaceSettings);

    Utils.validateLength(_roleName);

    uint256 newRoleId = ++roleCount;

    DataTypes.Role memory role = DataTypes.Role(newRoleId, _roleName);
    rolesById[newRoleId] = role;

    for (uint256 i = 0; i < _permissions.length; i++) {
      // only allow contract owner to add permission owner to role
      if (
        _ownerRoleIsSet() && Utils.isEqual(_permissions[i], Permissions.Owner)
      ) {
        revert Errors.NotAllowed();
      }

      bytes32 _permission = bytes32(abi.encodePacked(_permissions[i]));
      _permissionsByRoleId[newRoleId].push(_permission);
    }

    // loop through entitlement modules and set entitlement data for role
    for (uint256 i = 0; i < _entitlements.length; i++) {
      address _entitlementModule = _entitlements[i].module;
      bytes memory _entitlementData = _entitlements[i].data;

      // check for empty address or data
      if (_entitlementModule == address(0) || _entitlementData.length == 0) {
        continue;
      }

      // check if entitlement is valid
      if (hasEntitlement[_entitlementModule] == false) {
        revert Errors.EntitlementNotWhitelisted();
      }

      // set entitlement data for role
      _addRoleToEntitlementModule(
        newRoleId,
        _entitlementModule,
        _entitlementData
      );
    }

    emit Events.RoleCreated(_msgSender(), newRoleId, _roleName, networkId);

    return newRoleId;
  }

  /// @inheritdoc ISpace
  function updateRole(uint256 _roleId, string memory _roleName) external {
    _verifyPermission(_IN_SPACE, Permissions.ModifySpaceSettings);

    Utils.validateLength(_roleName);

    // check not renaming owner role
    if (_roleId == ownerRoleId) {
      revert Errors.NotAllowed();
    }

    // check if role exists
    if (rolesById[_roleId].roleId == 0) {
      revert Errors.RoleDoesNotExist();
    }

    rolesById[_roleId].name = _roleName;

    emit Events.RoleUpdated(_msgSender(), _roleId, _roleName, networkId);
  }

  /// @inheritdoc ISpace
  function removeRole(uint256 _roleId) external {
    _verifyPermission(_IN_SPACE, Permissions.ModifySpaceSettings);

    // check not removing owner role
    if (_roleId == ownerRoleId) {
      revert Errors.NotAllowed();
    }

    // check if role exists
    if (rolesById[_roleId].roleId == 0) {
      revert Errors.RoleDoesNotExist();
    }

    // check if role is used in entitlements
    if (_entitlementIdsByRoleId[_roleId].length > 0) {
      revert Errors.RoleIsAssignedToEntitlement();
    }

    // delete role
    delete rolesById[_roleId];

    // delete permissions of role
    delete _permissionsByRoleId[_roleId];

    emit Events.RoleRemoved(_msgSender(), _roleId, networkId);
  }

  /// @inheritdoc ISpace
  function getRoleById(
    uint256 _roleId
  ) external view returns (DataTypes.Role memory) {
    return rolesById[_roleId];
  }

  /// @inheritdoc ISpace
  function addPermissionsToRole(
    uint256 _roleId,
    string[] memory _permissions
  ) external {
    _verifyPermission(_IN_SPACE, Permissions.ModifySpaceSettings);

    // check if role exists
    if (rolesById[_roleId].roleId == 0) {
      revert Errors.RoleDoesNotExist();
    }

    // cannot add owner permission to role
    for (uint256 i = 0; i < _permissions.length; i++) {
      if (Utils.isEqual(_permissions[i], Permissions.Owner)) {
        revert Errors.NotAllowed();
      }

      bytes32 _permissionHash = bytes32(abi.encodePacked(_permissions[i]));

      // check if permission already exists
      for (uint256 j = 0; j < _permissionsByRoleId[_roleId].length; j++) {
        if (_permissionsByRoleId[_roleId][j] == _permissionHash) {
          revert Errors.PermissionAlreadyExists();
        }
      }

      // add permission to role
      _permissionsByRoleId[_roleId].push(_permissionHash);
    }
  }

  /// @inheritdoc ISpace
  function getPermissionsByRoleId(
    uint256 _roleId
  ) external view override returns (string[] memory) {
    uint256 permissionsLength = _permissionsByRoleId[_roleId].length;

    string[] memory _permissions = new string[](permissionsLength);

    for (uint256 i = 0; i < permissionsLength; i++) {
      _permissions[i] = Utils.bytes32ToString(_permissionsByRoleId[_roleId][i]);
    }

    return _permissions;
  }

  /// @inheritdoc ISpace
  function removePermissionsFromRole(
    uint256 _roleId,
    string[] memory _permissions
  ) external {
    _verifyPermission(_IN_SPACE, Permissions.ModifySpaceSettings);

    // check if role exists
    if (rolesById[_roleId].roleId == 0) {
      revert Errors.RoleDoesNotExist();
    }

    for (uint256 i = 0; i < _permissions.length; i++) {
      if (Utils.isEqual(_permissions[i], Permissions.Owner)) {
        revert Errors.NotAllowed();
      }

      bytes32 _permissionHash = bytes32(abi.encodePacked(_permissions[i]));

      // check if permission exists
      for (uint256 j = 0; j < _permissionsByRoleId[_roleId].length; j++) {
        if (_permissionsByRoleId[_roleId][j] != _permissionHash) continue;

        // remove permission from role
        _permissionsByRoleId[_roleId][j] = _permissionsByRoleId[_roleId][
          _permissionsByRoleId[_roleId].length - 1
        ];
        _permissionsByRoleId[_roleId].pop();
        break;
      }
    }
  }

  /// ***** Entitlement Management *****
  function upgradeEntitlement(
    address _entitlement,
    address _newEntitlement
  ) external {
    _verifyPermission(_IN_SPACE, Permissions.Owner);

    if (_entitlement == address(0) || _newEntitlement == address(0)) {
      revert Errors.InvalidParameters();
    }

    if (!hasEntitlement[_entitlement]) {
      revert Errors.EntitlementNotWhitelisted();
    }

    try UUPSUpgradeable(_entitlement).upgradeTo(_newEntitlement) {} catch {
      revert Errors.InvalidParameters();
    }
  }

  /// @inheritdoc ISpace
  function getEntitlementIdsByRoleId(
    uint256 _roleId
  ) external view returns (bytes32[] memory) {
    return _entitlementIdsByRoleId[_roleId];
  }

  /// @inheritdoc ISpace
  function getEntitlementByModuleType(
    string memory _moduleType
  ) external view returns (address) {
    address _entitlement;

    for (uint256 i = 0; i < entitlements.length; i++) {
      if (
        Utils.isEqual(IEntitlement(entitlements[i]).moduleType(), _moduleType)
      ) {
        _entitlement = entitlements[i];
      }
    }

    return _entitlement;
  }

  /// @inheritdoc ISpace
  function isEntitledToChannel(
    string calldata _channelId,
    address _user,
    string calldata _permission
  ) external view returns (bool _entitled) {
    // check that a _channelId is not empty
    if (
      bytes(_channelId).length == 0 ||
      bytes(_permission).length == 0 ||
      _user == address(0)
    ) {
      revert Errors.InvalidParameters();
    }

    bytes32 channelHash = keccak256(abi.encodePacked(_channelId));

    if (channelsByHash[channelHash].channelHash == 0) {
      revert Errors.ChannelDoesNotExist();
    }

    // check if channel is disabled
    if (channelsByHash[channelHash].disabled) {
      revert Errors.NotAllowed();
    }

    if (
      _isEntitled(_channelId, _user, bytes32(abi.encodePacked(_permission)))
    ) {
      _entitled = true;
    }
  }

  /// @inheritdoc ISpace
  function isEntitledToSpace(
    address _user,
    string calldata _permission
  ) external view returns (bool _entitled) {
    if (_isEntitled(_IN_SPACE, _user, bytes32(abi.encodePacked(_permission)))) {
      _entitled = true;
    }
  }

  function getChannels() external view returns (bytes32[] memory) {
    return channels;
  }

  /// @inheritdoc ISpace
  function getEntitlementModules()
    external
    view
    returns (DataTypes.EntitlementModule[] memory _entitlementModules)
  {
    _entitlementModules = new DataTypes.EntitlementModule[](
      entitlements.length
    );

    for (uint256 i = 0; i < entitlements.length; i++) {
      IEntitlement _entitlementModule = IEntitlement(entitlements[i]);

      _entitlementModules[i] = DataTypes.EntitlementModule({
        name: _entitlementModule.name(),
        moduleAddress: entitlements[i],
        moduleType: _entitlementModule.moduleType(),
        enabled: hasEntitlement[entitlements[i]]
      });
    }
  }

  /// @inheritdoc ISpace
  function setEntitlementModule(
    address _entitlementModule,
    bool _whitelist
  ) external {
    _verifyPermission(_IN_SPACE, Permissions.Owner);

    // validate entitlement interface
    _validateEntitlementInterface(_entitlementModule);

    // check if entitlement already exists
    if (_whitelist && hasEntitlement[_entitlementModule]) {
      revert Errors.EntitlementAlreadyWhitelisted();
    }

    // check if removing a default entitlement
    if (!_whitelist && defaultEntitlements[_entitlementModule]) {
      revert Errors.NotAllowed();
    }

    _setEntitlement(_entitlementModule, _whitelist);
  }

  /// @inheritdoc ISpace
  function removeRoleFromEntitlement(
    uint256 _roleId,
    DataTypes.Entitlement calldata _entitlement
  ) external {
    _verifyPermission(_IN_SPACE, Permissions.ModifySpaceSettings);

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

    // remove entitlementId from _entitlementIdsByRoleId
    bytes32[] storage entitlementIds = _entitlementIdsByRoleId[_roleId];
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
    _verifyPermission(_IN_SPACE, Permissions.ModifySpaceSettings);

    if (!hasEntitlement[_entitlement.module]) {
      revert Errors.EntitlementNotWhitelisted();
    }

    // check that role id exists
    if (rolesById[_roleId].roleId == 0) {
      revert Errors.RoleDoesNotExist();
    }

    // check not adding entitlements to owner role
    if (_roleId == ownerRoleId) {
      revert Errors.NotAllowed();
    }

    _addRoleToEntitlementModule(
      _roleId,
      _entitlement.module,
      _entitlement.data
    );
  }

  /// @inheritdoc ISpace
  function addRoleToChannel(
    string calldata _channelId,
    address _entitlement,
    uint256 _roleId
  ) external {
    _verifyPermission(_channelId, Permissions.AddRemoveChannels);

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
    _verifyPermission(_channelId, Permissions.AddRemoveChannels);

    if (!hasEntitlement[_entitlement]) {
      revert Errors.EntitlementNotWhitelisted();
    }

    // check that role id exists
    if (rolesById[_roleId].roleId == 0) {
      revert Errors.RoleDoesNotExist();
    }

    IEntitlement(_entitlement).removeRoleIdFromChannel(_channelId, _roleId);
  }

  /// @inheritdoc IERC165
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override returns (bool) {
    return
      interfaceId == type(ISpace).interfaceId ||
      interfaceId == type(IERC165).interfaceId;
  }

  /// ***** Internal *****
  function _addRoleToEntitlementModule(
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
    bytes32[] memory entitlementIds = _entitlementIdsByRoleId[_roleId];
    uint256 entitlementLen = entitlementIds.length;

    for (uint256 i = 0; i < entitlementLen; i++) {
      if (entitlementIds[i] == entitlementId) {
        revert Errors.EntitlementAlreadyExists();
      }
    }

    // keep track of which entitlements are associated with a role
    _entitlementIdsByRoleId[_roleId].push(entitlementId);

    IEntitlement(_entitlement).setEntitlement(_roleId, _entitlementData);
  }

  function _isOwner() internal view returns (bool) {
    return IERC721(token).ownerOf(tokenId) == _msgSender();
  }

  function _verifyPermission(
    string memory _channelId,
    string memory _permission
  ) internal view {
    if (_isAllowed(_channelId, _permission)) {
      return;
    } else {
      revert Errors.NotAllowed();
    }
  }

  function _isAllowed(
    string memory _channelId,
    string memory _permission
  ) internal view returns (bool) {
    return
      _isOwner() ||
      (!disabled &&
        _isEntitled(
          _channelId,
          _msgSender(),
          bytes32(abi.encodePacked(_permission))
        ));
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

  function _ownerRoleIsSet() internal view returns (bool) {
    return ownerRoleId != 0;
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

  function _canSetContractURI() internal view override returns (bool) {
    return _isOwner();
  }

  function _authorizeUpgrade(address) internal view override {
    if (!_isAllowed(_IN_SPACE, Permissions.Upgrade)) revert Errors.NotAllowed();
  }

  /**
   * @dev Added to allow future versions to add new variables in case this contract becomes
   *      inherited. See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
   */
  uint256[49] private __gap;
}
