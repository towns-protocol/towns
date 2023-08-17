// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

/** Interfaces */
import {ISpaceFactory} from "contracts/src/spaces/interfaces/ISpaceFactory.sol";
import {IEntitlement} from "contracts/src/spaces/interfaces/IEntitlement.sol";
import {IERC721} from "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import {ISpaceUpgrades} from "contracts/src/spaces/interfaces/ISpaceUpgrades.sol";

/** Libraries */
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";
import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";
import {Events} from "contracts/src/spaces/libraries/Events.sol";
import {Errors} from "contracts/src/spaces/libraries/Errors.sol";
import {Utils} from "contracts/src/spaces/libraries/Utils.sol";

/** Contracts */
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Initializable} from "openzeppelin-contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "openzeppelin-contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ERC721HolderUpgradeable} from "openzeppelin-contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import {PausableUpgradeable} from "openzeppelin-contracts-upgradeable/security/PausableUpgradeable.sol";

import {TokenEntitlement} from "contracts/src/spaces/entitlements/TokenEntitlement.sol";
import {UserEntitlement} from "contracts/src/spaces/entitlements/UserEntitlement.sol";
import {Space} from "contracts/src/spaces/Space.sol";
import {TownOwnerV1} from "contracts/src/tokens/TownOwnerV1.sol";

contract SpaceFactory is
  Initializable,
  OwnableUpgradeable,
  PausableUpgradeable,
  ReentrancyGuardUpgradeable,
  ERC721HolderUpgradeable,
  UUPSUpgradeable,
  ISpaceFactory
{
  string internal constant _everyoneRoleName = "Everyone";
  string internal constant _ownerRoleName = "Owner";

  address public SPACE_IMPLEMENTATION_ADDRESS;
  address public TOKEN_IMPLEMENTATION_ADDRESS;
  address public USER_IMPLEMENTATION_ADDRESS;
  address public SPACE_TOKEN_ADDRESS;
  address public GATE_TOKEN_ADDRESS;

  bool public gatingEnabled;
  string[] public ownerPermissions;
  mapping(bytes32 => address) public spaceByHash;
  mapping(bytes32 => uint256) public tokenByHash;

  address public SPACE_UPGRADES_ADDRESS;

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(
    address _space,
    address _tokenEntitlement,
    address _userEntitlement,
    address _spaceToken,
    address _gateToken,
    string[] memory _permissions
  ) external initializer {
    __UUPSUpgradeable_init();
    __Ownable_init();
    __Pausable_init();
    __ReentrancyGuard_init();
    __ERC721Holder_init();

    SPACE_IMPLEMENTATION_ADDRESS = _space;
    TOKEN_IMPLEMENTATION_ADDRESS = _tokenEntitlement;
    USER_IMPLEMENTATION_ADDRESS = _userEntitlement;
    SPACE_TOKEN_ADDRESS = _spaceToken;
    GATE_TOKEN_ADDRESS = _gateToken;
    gatingEnabled = false;

    for (uint256 i = 0; i < _permissions.length; i++) {
      ownerPermissions.push(_permissions[i]);
    }
  }

  /// @inheritdoc ISpaceFactory
  function updateImplementations(
    address _space,
    address _tokenEntitlement,
    address _userEntitlement,
    address _gateToken,
    address _spaceUpgrades
  ) external onlyOwner whenPaused {
    if (_space != address(0)) SPACE_IMPLEMENTATION_ADDRESS = _space;
    if (_tokenEntitlement != address(0))
      TOKEN_IMPLEMENTATION_ADDRESS = _tokenEntitlement;
    if (_userEntitlement != address(0))
      USER_IMPLEMENTATION_ADDRESS = _userEntitlement;
    if (_gateToken != address(0)) GATE_TOKEN_ADDRESS = _gateToken;
    if (_spaceUpgrades != address(0)) SPACE_UPGRADES_ADDRESS = _spaceUpgrades;
  }

  /// @inheritdoc ISpaceFactory
  function createSpace(
    DataTypes.CreateSpaceData calldata _spaceData,
    string[] calldata _everyonePermissions,
    DataTypes.CreateSpaceExtraEntitlements calldata _extraEntitlements
  ) external nonReentrant whenNotPaused returns (address _spaceAddress) {
    _validateGatingEnabled();

    // validate space name
    Utils.validateLength(_spaceData.spaceName);

    // validate space network id
    if (bytes(_spaceData.spaceId).length == 0) {
      revert Errors.InvalidParameters();
    }

    // hash the network id
    bytes32 _networkHash = keccak256(bytes(_spaceData.spaceId));

    // validate that the network id hasn't been used before
    if (spaceByHash[_networkHash] != address(0)) {
      revert Errors.SpaceAlreadyRegistered();
    }

    // mint space nft to owner
    uint256 _tokenId = TownOwnerV1(SPACE_TOKEN_ADDRESS).nextTokenId();
    TownOwnerV1(SPACE_TOKEN_ADDRESS).mintTo(
      address(this),
      _spaceData.spaceMetadata
    );

    // save token id to mapping
    tokenByHash[_networkHash] = _tokenId;

    // deploy token entitlement module
    address _tokenEntitlement = address(
      new ERC1967Proxy(
        TOKEN_IMPLEMENTATION_ADDRESS,
        abi.encodeCall(
          TokenEntitlement.initialize,
          (SPACE_TOKEN_ADDRESS, _tokenId)
        )
      )
    );

    // deploy user entitlement module
    address _userEntitlement = address(
      new ERC1967Proxy(
        USER_IMPLEMENTATION_ADDRESS,
        abi.encodeCall(
          UserEntitlement.initialize,
          (SPACE_TOKEN_ADDRESS, _tokenId)
        )
      )
    );

    address[] memory _entitlements = new address[](2);
    _entitlements[0] = _tokenEntitlement;
    _entitlements[1] = _userEntitlement;

    // deploy the space contract
    _spaceAddress = address(
      new ERC1967Proxy(
        SPACE_IMPLEMENTATION_ADDRESS,
        abi.encodeCall(
          Space.initialize,
          (
            _spaceData.spaceName,
            _spaceData.spaceId,
            SPACE_TOKEN_ADDRESS,
            _tokenId,
            _entitlements
          )
        )
      )
    );

    // save space address to mapping
    spaceByHash[_networkHash] = _spaceAddress;

    // set space on entitlement modules
    for (uint256 i = 0; i < _entitlements.length; i++) {
      IEntitlement(_entitlements[i]).setSpace(_spaceAddress);
    }

    _createChannel(
      _spaceAddress,
      _createOwnerEntitlement(_spaceAddress, _tokenEntitlement, _tokenId),
      _createEveryoneEntitlement(
        _spaceAddress,
        _userEntitlement,
        _everyonePermissions
      ),
      _createExtraEntitlements(
        _spaceAddress,
        _tokenEntitlement,
        _userEntitlement,
        _extraEntitlements
      ),
      _spaceData.channelName,
      _spaceData.channelId
    );

    _createUpgradesEntitlement(_spaceAddress, _userEntitlement);

    ISpaceUpgrades(SPACE_UPGRADES_ADDRESS).register(
      _spaceAddress,
      SPACE_IMPLEMENTATION_ADDRESS
    );

    TownOwnerV1(SPACE_TOKEN_ADDRESS).safeTransferFrom(
      address(this),
      _msgSender(),
      _tokenId
    );

    emit Events.SpaceCreated(_spaceAddress, _msgSender(), _spaceData.spaceId);
  }

  function _createChannel(
    address _spaceAddress,
    uint256 _ownerRoleId,
    uint256 _everyoneRoleId,
    uint256 _additionalRoleId,
    string memory _channelName,
    string memory _channelId
  ) internal {
    uint256[] memory _roleIds = new uint256[](2);

    _roleIds[0] = _ownerRoleId;

    if (_additionalRoleId != 0) {
      _roleIds[1] = _additionalRoleId;
    } else {
      _roleIds[1] = _everyoneRoleId;
    }

    // // create channel on space
    Space(_spaceAddress).createChannel(_channelName, _channelId, _roleIds);
  }

  function setGatingEnabled(bool _gatingEnabled) external onlyOwner whenPaused {
    gatingEnabled = _gatingEnabled;
  }

  function setSpaceToken(address _spaceToken) external onlyOwner whenPaused {
    SPACE_TOKEN_ADDRESS = _spaceToken;
  }

  function setPaused(bool _paused) external onlyOwner {
    if (_paused) {
      _pause();
    } else {
      _unpause();
    }
  }

  /// @inheritdoc ISpaceFactory
  function addOwnerPermissions(
    string[] calldata _permissions
  ) external onlyOwner whenPaused {
    // check permission doesn't already exist
    for (uint256 i = 0; i < _permissions.length; i++) {
      for (uint256 j = 0; j < ownerPermissions.length; j++) {
        if (Utils.isEqual(_permissions[i], ownerPermissions[j])) {
          revert Errors.PermissionAlreadyExists();
        }
      }

      // add permission to initial permissions
      ownerPermissions.push(_permissions[i]);
    }
  }

  /// @inheritdoc ISpaceFactory
  function getTokenIdByNetworkId(
    string calldata spaceId
  ) external view returns (uint256) {
    bytes32 _networkHash = keccak256(bytes(spaceId));
    return tokenByHash[_networkHash];
  }

  /// @inheritdoc ISpaceFactory
  function getSpaceAddressByNetworkId(
    string calldata spaceId
  ) external view returns (address) {
    bytes32 _networkHash = keccak256(bytes(spaceId));
    return spaceByHash[_networkHash];
  }

  /// @inheritdoc ISpaceFactory
  function getOwnerPermissions() external view returns (string[] memory) {
    return ownerPermissions;
  }

  /// ****************************
  /// Internal functions
  /// ****************************
  function _createUpgradesEntitlement(
    address _spaceAddress,
    address _userEntitlementAddress
  ) internal {
    if (SPACE_UPGRADES_ADDRESS == address(0)) return;

    DataTypes.Entitlement[] memory _entitlements = new DataTypes.Entitlement[](
      1
    );

    address[] memory users = new address[](1);
    users[0] = SPACE_UPGRADES_ADDRESS;

    _entitlements[0] = DataTypes.Entitlement({
      module: _userEntitlementAddress,
      data: abi.encode(users)
    });

    string[] memory _permissions = new string[](1);
    _permissions[0] = Permissions.Upgrade;

    Space(_spaceAddress).createRole("Upgrade", _permissions, _entitlements);
  }

  function _createExtraEntitlements(
    address spaceAddress,
    address tokenAddress,
    address userAddress,
    DataTypes.CreateSpaceExtraEntitlements memory _extraEntitlements
  ) internal returns (uint256 additionalRoleId) {
    if (_extraEntitlements.permissions.length == 0) return 0;

    DataTypes.Entitlement[] memory _entitlements = new DataTypes.Entitlement[](
      1
    );
    _entitlements[0] = DataTypes.Entitlement(address(0), "");

    additionalRoleId = Space(spaceAddress).createRole(
      _extraEntitlements.roleName,
      _extraEntitlements.permissions,
      _entitlements
    );

    // check entitlementdata has users
    if (_extraEntitlements.users.length > 0) {
      Space(spaceAddress).addRoleToEntitlement(
        additionalRoleId,
        DataTypes.Entitlement(userAddress, abi.encode(_extraEntitlements.users))
      );
    }

    // check entitlementdata has tokens
    if (_extraEntitlements.tokens.length == 0) return additionalRoleId;

    Space(spaceAddress).addRoleToEntitlement(
      additionalRoleId,
      DataTypes.Entitlement(tokenAddress, abi.encode(_extraEntitlements.tokens))
    );
  }

  function _createOwnerEntitlement(
    address spaceAddress,
    address tokenAddress,
    uint256 tokenId
  ) internal returns (uint256 ownerRoleId) {
    // create external token struct
    DataTypes.ExternalToken[] memory tokens = new DataTypes.ExternalToken[](1);

    uint256[] memory tokenIds = new uint256[](1);
    tokenIds[0] = tokenId;

    // assign token data to struct
    tokens[0] = DataTypes.ExternalToken({
      contractAddress: SPACE_TOKEN_ADDRESS,
      quantity: 1,
      isSingleToken: true,
      tokenIds: tokenIds
    });

    DataTypes.Entitlement[] memory _entitlements = new DataTypes.Entitlement[](
      1
    );
    _entitlements[0] = DataTypes.Entitlement({
      module: tokenAddress,
      data: abi.encode(tokens)
    });

    // create owner role with all permissions
    ownerRoleId = Space(spaceAddress).createRole(
      _ownerRoleName,
      ownerPermissions,
      _entitlements
    );

    Space(spaceAddress).setOwnerRoleId(ownerRoleId);
  }

  function _createEveryoneEntitlement(
    address spaceAddress,
    address userAddress,
    string[] memory _permissions
  ) internal returns (uint256 everyoneRoleId) {
    DataTypes.Entitlement[] memory _entitlements = new DataTypes.Entitlement[](
      1
    );

    address[] memory users = new address[](1);
    users[0] = Utils.EVERYONE_ADDRESS;

    _entitlements[0] = DataTypes.Entitlement({
      module: userAddress,
      data: abi.encode(users)
    });

    everyoneRoleId = Space(spaceAddress).createRole(
      _everyoneRoleName,
      _permissions,
      _entitlements
    );
  }

  function _validateGatingEnabled() internal view {
    if (
      gatingEnabled && IERC721(GATE_TOKEN_ADDRESS).balanceOf(_msgSender()) == 0
    ) {
      revert Errors.NotAllowed();
    }
  }

  function _authorizeUpgrade(
    address newImplementation
  ) internal override onlyOwner {}

  /**
   * @dev Added to allow future versions to add new variables in case this contract becomes
   *      inherited. See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
   */
  uint256[49] private __gap;
}
