// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

/** Interfaces */
import {ISpaceFactory} from "./interfaces/ISpaceFactory.sol";
import {ISpaceOwner} from "./interfaces/ISpaceOwner.sol";
import {IEntitlement} from "./interfaces/IEntitlement.sol";

/** Libraries */
import {Permissions} from "./libraries/Permissions.sol";
import {DataTypes} from "./libraries/DataTypes.sol";
import {Events} from "./libraries/Events.sol";
import {Errors} from "./libraries/Errors.sol";
import {Utils} from "./libraries/Utils.sol";

/** Contracts */
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Initializable} from "openzeppelin-contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "openzeppelin-contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import {TokenEntitlement} from "./entitlements/TokenEntitlement.sol";
import {UserEntitlement} from "./entitlements/UserEntitlement.sol";
import {Space} from "./Space.sol";

contract SpaceFactory is
  Initializable,
  OwnableUpgradeable,
  ReentrancyGuardUpgradeable,
  UUPSUpgradeable,
  ISpaceFactory
{
  string internal constant everyoneRoleName = "Everyone";
  string internal constant ownerRoleName = "Owner";

  address public SPACE_IMPLEMENTATION_ADDRESS;
  address public TOKEN_IMPLEMENTATION_ADDRESS;
  address public USER_IMPLEMENTATION_ADDRESS;
  address public SPACE_TOKEN_ADDRESS;

  string[] public ownerPermissions;
  mapping(bytes32 => address) public spaceByHash;
  mapping(bytes32 => uint256) public tokenByHash;

  function initialize(
    address _space,
    address _tokenEntitlement,
    address _userEntitlement,
    address _spaceToken,
    string[] memory _permissions
  ) external initializer {
    __UUPSUpgradeable_init();
    __Ownable_init();
    __ReentrancyGuard_init();

    SPACE_IMPLEMENTATION_ADDRESS = _space;
    TOKEN_IMPLEMENTATION_ADDRESS = _tokenEntitlement;
    USER_IMPLEMENTATION_ADDRESS = _userEntitlement;
    SPACE_TOKEN_ADDRESS = _spaceToken;

    for (uint256 i = 0; i < _permissions.length; i++) {
      ownerPermissions.push(_permissions[i]);
    }
  }

  /// @inheritdoc ISpaceFactory
  function updateImplementations(
    address _space,
    address _tokenEntitlement,
    address _userEntitlement
  ) external onlyOwner {
    if (_space != address(0)) SPACE_IMPLEMENTATION_ADDRESS = _space;
    if (_tokenEntitlement != address(0))
      TOKEN_IMPLEMENTATION_ADDRESS = _tokenEntitlement;
    if (_userEntitlement != address(0))
      USER_IMPLEMENTATION_ADDRESS = _userEntitlement;
  }

  /// @inheritdoc ISpaceFactory
  function createSpace(
    string calldata spaceName,
    string calldata spaceNetworkId,
    string calldata spaceMetadata,
    string[] calldata _everyonePermissions,
    DataTypes.CreateSpaceExtraEntitlements calldata _extraEntitlements
  ) external nonReentrant returns (address _spaceAddress) {
    // validate space name
    Utils.validateName(spaceName);

    // validate space network id
    if (bytes(spaceNetworkId).length == 0) {
      revert Errors.InvalidParameters();
    }

    // hash the network id
    bytes32 _networkHash = keccak256(bytes(spaceNetworkId));

    // validate that the network id hasn't been used before
    if (spaceByHash[_networkHash] != address(0)) {
      revert Errors.SpaceAlreadyRegistered();
    }

    // mint space nft to owner
    uint256 _tokenId = ISpaceOwner(SPACE_TOKEN_ADDRESS).mintTo(
      _msgSender(),
      spaceMetadata
    );

    // save token id to mapping
    tokenByHash[_networkHash] = _tokenId;

    // deploy token entitlement module
    address _tokenEntitlement = address(
      new ERC1967Proxy(
        TOKEN_IMPLEMENTATION_ADDRESS,
        abi.encodeCall(TokenEntitlement.initialize, ())
      )
    );

    // deploy user entitlement module
    address _userEntitlement = address(
      new ERC1967Proxy(
        USER_IMPLEMENTATION_ADDRESS,
        abi.encodeCall(UserEntitlement.initialize, ())
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
          (spaceName, spaceNetworkId, _entitlements)
        )
      )
    );

    // save space address to mapping
    spaceByHash[_networkHash] = _spaceAddress;

    // set space on entitlement modules
    for (uint256 i = 0; i < _entitlements.length; i++) {
      IEntitlement(_entitlements[i]).setSpace(_spaceAddress);
    }

    _createOwnerEntitlement(_spaceAddress, _tokenEntitlement, _tokenId);
    _createEveryoneEntitlement(
      _spaceAddress,
      _userEntitlement,
      _everyonePermissions
    );
    _createExtraEntitlements(
      _spaceAddress,
      _tokenEntitlement,
      _userEntitlement,
      _extraEntitlements
    );

    Space(_spaceAddress).renounceOwnership();

    emit Events.SpaceCreated(_spaceAddress, _msgSender(), spaceNetworkId);
  }

  /// @inheritdoc ISpaceFactory
  function addOwnerPermissions(
    string[] calldata _permissions
  ) external onlyOwner {
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
    string calldata spaceNetworkId
  ) external view returns (uint256) {
    bytes32 _networkHash = keccak256(bytes(spaceNetworkId));
    return tokenByHash[_networkHash];
  }

  /// @inheritdoc ISpaceFactory
  function getSpaceAddressByNetworkId(
    string calldata spaceNetworkId
  ) external view returns (address) {
    bytes32 _networkHash = keccak256(bytes(spaceNetworkId));
    return spaceByHash[_networkHash];
  }

  /// @inheritdoc ISpaceFactory
  function getOwnerPermissions() external view returns (string[] memory) {
    return ownerPermissions;
  }

  /// ****************************
  /// Internal functions
  /// ****************************
  function _createExtraEntitlements(
    address spaceAddress,
    address tokenAddress,
    address userAddress,
    DataTypes.CreateSpaceExtraEntitlements memory _extraEntitlements
  ) internal {
    if (_extraEntitlements.permissions.length == 0) return;

    DataTypes.Entitlement[] memory _entitlements = new DataTypes.Entitlement[](
      1
    );
    _entitlements[0] = DataTypes.Entitlement(address(0), "");

    uint256 additionalRoleId = Space(spaceAddress).createRole(
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
    if (_extraEntitlements.tokens.length == 0) return;

    Space(spaceAddress).addRoleToEntitlement(
      additionalRoleId,
      DataTypes.Entitlement(tokenAddress, abi.encode(_extraEntitlements.tokens))
    );
  }

  function _createOwnerEntitlement(
    address spaceAddress,
    address tokenAddress,
    uint256 tokenId
  ) internal {
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
    uint256 ownerRoleId = Space(spaceAddress).createRole(
      ownerRoleName,
      ownerPermissions,
      _entitlements
    );

    Space(spaceAddress).setOwnerRoleId(ownerRoleId);
  }

  function _createEveryoneEntitlement(
    address spaceAddress,
    address userAddress,
    string[] memory _permissions
  ) internal {
    DataTypes.Entitlement[] memory _entitlements = new DataTypes.Entitlement[](
      1
    );

    address[] memory users = new address[](1);
    users[0] = Utils.EVERYONE_ADDRESS;

    _entitlements[0] = DataTypes.Entitlement({
      module: userAddress,
      data: abi.encode(users)
    });

    Space(spaceAddress).createRole(
      everyoneRoleName,
      _permissions,
      _entitlements
    );
  }

  function _authorizeUpgrade(
    address newImplementation
  ) internal override onlyOwner {}
}
