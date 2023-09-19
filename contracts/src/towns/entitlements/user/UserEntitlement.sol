// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

// interfaces
import {IEntitlement} from "../IEntitlement.sol";
import {IRoles} from "contracts/src/towns/facets/roles/IRoles.sol";
import {IChannel} from "contracts/src/towns/facets/channels/IChannel.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts
import {Initializable} from "openzeppelin-contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC165Upgradeable} from "openzeppelin-contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {ContextUpgradeable} from "openzeppelin-contracts-upgradeable/utils/ContextUpgradeable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract UserEntitlement is
  Initializable,
  ERC165Upgradeable,
  ContextUpgradeable,
  UUPSUpgradeable,
  IEntitlement
{
  using EnumerableSet for EnumerableSet.Bytes32Set;

  address constant EVERYONE_ADDRESS = address(1);
  address public TOWN_ADDRESS;

  struct Entitlement {
    uint256 roleId;
    address grantedBy;
    uint256 grantedTime;
    address[] users;
  }

  mapping(bytes32 => Entitlement) internal entitlementsById;
  mapping(uint256 => EnumerableSet.Bytes32Set) internal entitlementIdsByRoleId;
  mapping(address => EnumerableSet.Bytes32Set) internal entitlementIdsByUser;

  string public constant name = "User Entitlement";
  string public constant description = "Entitlement for users";
  string public constant moduleType = "UserEntitlement";

  modifier onlyTown() {
    if (_msgSender() != TOWN_ADDRESS) {
      revert Entitlement__NotAllowed();
    }
    _;
  }

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(address _space) public initializer {
    __UUPSUpgradeable_init();
    __ERC165_init();
    __Context_init();

    TOWN_ADDRESS = _space;
  }

  /// @notice allow the contract to be upgraded while retaining state
  /// @param newImplementation address of the new implementation
  function _authorizeUpgrade(
    address newImplementation
  ) internal override onlyTown {}

  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override returns (bool) {
    return
      interfaceId == type(IEntitlement).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  // @inheritdoc IEntitlement
  function isEntitled(
    string calldata channelId,
    address user,
    bytes32 permission
  ) external view returns (bool) {
    if (bytes(channelId).length > 0) {
      return _isEntitledToChannel(channelId, user, permission);
    } else {
      return _isEntitledToSpace(user, permission);
    }
  }

  // @inheritdoc IEntitlement
  function setEntitlement(
    uint256 roleId,
    bytes calldata entitlementData
  ) external onlyTown returns (bytes32 entitlementId) {
    entitlementId = keccak256(abi.encodePacked(roleId, entitlementData));

    address[] memory users = abi.decode(entitlementData, (address[]));

    if (users.length == 0) {
      revert Entitlement__InvalidValue();
    }

    for (uint256 i = 0; i < users.length; i++) {
      address user = users[i];
      if (user == address(0)) {
        revert Entitlement__InvalidValue();
      }

      entitlementIdsByUser[user].add(entitlementId);
    }

    entitlementsById[entitlementId] = Entitlement({
      grantedBy: _msgSender(),
      grantedTime: block.timestamp,
      roleId: roleId,
      users: users
    });

    entitlementIdsByRoleId[roleId].add(entitlementId);
  }

  // @inheritdoc IEntitlement
  function removeEntitlement(
    uint256 roleId,
    bytes calldata entitlementData
  ) external onlyTown returns (bytes32 entitlementId) {
    entitlementId = keccak256(abi.encodePacked(roleId, entitlementData));

    Entitlement memory entitlement = entitlementsById[entitlementId];

    if (entitlement.users.length == 0 || entitlement.roleId == 0) {
      revert Entitlement__InvalidValue();
    }

    entitlementIdsByRoleId[entitlement.roleId].remove(entitlementId);

    for (uint256 i = 0; i < entitlement.users.length; i++) {
      address user = entitlement.users[i];
      entitlementIdsByUser[user].remove(entitlementId);
    }

    delete entitlementsById[entitlementId];
  }

  // @inheritdoc IEntitlement
  function getEntitlementDataByRoleId(
    uint256 roleId
  ) external view returns (bytes[] memory) {
    bytes32[] memory entitlementIds = entitlementIdsByRoleId[roleId].values();
    uint256 length = entitlementIds.length;

    bytes[] memory entitlements = new bytes[](length);

    for (uint256 i = 0; i < length; i++) {
      entitlements[i] = abi.encode(entitlementsById[entitlementIds[i]].users);
    }

    return entitlements;
  }

  /// @notice checks is a user is entitled to a specific channel
  /// @param channelId the channel id
  /// @param user the user address who we are checking for
  /// @param permission the permission we are checking for
  /// @return _entitled true if the user is entitled to the channel
  function _isEntitledToChannel(
    string calldata channelId,
    address user,
    bytes32 permission
  ) internal view returns (bool _entitled) {
    IChannel.Channel memory channel = IChannel(TOWN_ADDRESS).getChannel(
      channelId
    );

    // get all entitlements for a everyone address
    Entitlement[] memory everyone = _getEntitlementByUser(EVERYONE_ADDRESS);

    // get all entitlement for a single address
    Entitlement[] memory single = _getEntitlementByUser(user);

    // combine everyone and single entitlements
    Entitlement[] memory validEntitlements = concatArrays(everyone, single);

    // loop over all role ids in a channel
    for (uint256 i = 0; i < channel.roleIds.length; i++) {
      // get each role id
      uint256 roleId = channel.roleIds[i];

      // loop over all the valid entitlements
      for (uint256 j = 0; j < validEntitlements.length; j++) {
        // check if the role id for that channel matches the entitlement role id
        // and if the permission matches the role permission
        if (
          validEntitlements[j].roleId == roleId &&
          _validateRolePermission(validEntitlements[j].roleId, permission)
        ) {
          _entitled = true;
        }
      }
    }
  }

  /// @notice gets all the entitlements given to a specific user
  /// @param user the user address
  /// @return entitlements the entitlements
  function _getEntitlementByUser(
    address user
  ) internal view returns (Entitlement[] memory entitlements) {
    bytes32[] memory _entitlementIds = entitlementIdsByUser[user].values();
    uint256 entitlementIdsLen = _entitlementIds.length;

    entitlements = new Entitlement[](entitlementIdsLen);

    for (uint256 i = 0; i < entitlementIdsLen; i++) {
      entitlements[i] = entitlementsById[_entitlementIds[i]];
    }

    return entitlements;
  }

  /// @notice checks if a user is entitled to a specific space
  /// @param user the user address
  /// @param permission the permission we are checking for
  /// @return _entitled true if the user is entitled to the space
  function _isEntitledToSpace(
    address user,
    bytes32 permission
  ) internal view returns (bool) {
    Entitlement[] memory everyone = _getEntitlementByUser(EVERYONE_ADDRESS);

    Entitlement[] memory single = _getEntitlementByUser(user);

    Entitlement[] memory validEntitlements = concatArrays(everyone, single);
    uint256 validEntitlementsLen = validEntitlements.length;

    for (uint256 i = 0; i < validEntitlementsLen; i++) {
      if (_validateRolePermission(validEntitlements[i].roleId, permission)) {
        return true;
      }
    }

    return false;
  }

  /// @notice checks if a role has a specific permission
  /// @param roleId the role id
  /// @param permission the permission we are checking for
  /// @return _hasPermission true if the role has the permission
  function _validateRolePermission(
    uint256 roleId,
    bytes32 permission
  ) internal view returns (bool) {
    string[] memory permissions = IRoles(TOWN_ADDRESS).getPermissionsByRoleId(
      roleId
    );
    uint256 permissionLen = permissions.length;

    for (uint256 i = 0; i < permissionLen; i++) {
      if (bytes32(abi.encodePacked(permissions[i])) == permission) {
        return true;
      }
    }

    return false;
  }

  /// @notice utility to concat two arrays
  /// @param a the first array
  /// @param b the second array
  /// @return c the combined array
  function concatArrays(
    Entitlement[] memory a,
    Entitlement[] memory b
  ) internal pure returns (Entitlement[] memory) {
    Entitlement[] memory c = new Entitlement[](a.length + b.length);
    uint256 i = 0;
    for (; i < a.length; i++) {
      c[i] = a[i];
    }
    uint256 j = 0;
    while (j < b.length) {
      c[i++] = b[j++];
    }
    return c;
  }

  /**
   * @dev Added to allow future versions to add new variables in case this contract becomes
   *      inherited. See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
   */
  uint256[49] private __gap;
}
