// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces
import {IEntitlement} from "../IEntitlement.sol";
import {IRoles} from "contracts/src/spaces/facets/roles/IRoles.sol";
import {IChannel} from "contracts/src/spaces/facets/channels/IChannel.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {IUserEntitlement} from "./IUserEntitlement.sol";

contract UserEntitlement is
  Initializable,
  ERC165Upgradeable,
  ContextUpgradeable,
  UUPSUpgradeable,
  IUserEntitlement
{
  using EnumerableSet for EnumerableSet.UintSet;

  address constant EVERYONE_ADDRESS = address(1);
  address public SPACE_ADDRESS;

  struct Entitlement {
    address grantedBy;
    uint256 grantedTime;
    address[] users;
  }

  /// @notice mapping holding all the entitlements by RoleId added to Entitlement
  mapping(uint256 => Entitlement) internal entitlementsByRoleId;
  mapping(address => uint256[]) internal roleIdsByUser;
  EnumerableSet.UintSet allEntitlementRoleIds;

  string public constant name = "User Entitlement";
  string public constant description = "Entitlement for users";
  string public constant moduleType = "UserEntitlement";

  modifier onlySpace() {
    if (_msgSender() != SPACE_ADDRESS) {
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

    SPACE_ADDRESS = _space;
  }

  /// @notice allow the contract to be upgraded while retaining state
  /// @param newImplementation address of the new implementation
  function _authorizeUpgrade(
    address newImplementation
  ) internal override onlySpace {}

  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override returns (bool) {
    return
      interfaceId == type(IEntitlement).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  // @inheritdoc IEntitlement
  function isCrosschain() external pure override returns (bool) {
    return false;
  }

  // @inheritdoc IEntitlement
  function isEntitled(
    bytes32 channelId,
    address[] memory wallets,
    bytes32 permission
  ) external view returns (bool) {
    // Check if channelId is not equal to the zero value for bytes32
    if (channelId != bytes32(0)) {
      return _isEntitledToChannel(channelId, wallets, permission);
    } else {
      return _isEntitledToSpace(wallets, permission);
    }
  }

  // @inheritdoc IEntitlement
  function setEntitlement(
    uint256 roleId,
    bytes calldata entitlementData
  ) external onlySpace {
    address[] memory users = abi.decode(entitlementData, (address[]));

    for (uint256 i = 0; i < users.length; i++) {
      address user = users[i];
      if (user == address(0)) {
        revert Entitlement__InvalidValue();
      }
    }

    // First remove any prior values
    while (entitlementsByRoleId[roleId].users.length > 0) {
      address user = entitlementsByRoleId[roleId].users[
        entitlementsByRoleId[roleId].users.length - 1
      ];
      _removeRoleIdFromUser(user, roleId);
      entitlementsByRoleId[roleId].users.pop();
    }
    delete entitlementsByRoleId[roleId];

    entitlementsByRoleId[roleId] = Entitlement({
      grantedBy: _msgSender(),
      grantedTime: block.timestamp,
      users: users
    });
    for (uint256 i = 0; i < users.length; i++) {
      roleIdsByUser[users[i]].push(roleId);
    }
  }

  // @inheritdoc IEntitlement
  function removeEntitlement(uint256 roleId) external onlySpace {
    if (entitlementsByRoleId[roleId].grantedBy == address(0)) {
      revert Entitlement__InvalidValue();
    }

    // First remove any prior values
    while (entitlementsByRoleId[roleId].users.length > 0) {
      address user = entitlementsByRoleId[roleId].users[
        entitlementsByRoleId[roleId].users.length - 1
      ];
      _removeRoleIdFromUser(user, roleId);
      entitlementsByRoleId[roleId].users.pop();
    }
    delete entitlementsByRoleId[roleId];
  }

  // @inheritdoc IEntitlement
  function getEntitlementDataByRoleId(
    uint256 roleId
  ) external view returns (bytes memory) {
    return abi.encode(entitlementsByRoleId[roleId].users);
  }

  /// @notice checks is a user is entitled to a specific channel
  /// @param channelId the channel id
  /// @param wallets the user address who we are checking for
  /// @param permission the permission we are checking for
  /// @return _entitled true if the user is entitled to the channel
  function _isEntitledToChannel(
    bytes32 channelId,
    address[] memory wallets,
    bytes32 permission
  ) internal view returns (bool _entitled) {
    IChannel.Channel memory channel = IChannel(SPACE_ADDRESS).getChannel(
      channelId
    );

    // get all the roleids for the user
    uint256[] memory rolesIds = _getRoleIdsByUser(wallets);

    // loop over all role ids in a channel
    for (uint256 i = 0; i < channel.roleIds.length; i++) {
      // get each role id
      uint256 roleId = channel.roleIds[i];

      // loop over all the valid entitlements
      for (uint256 j = 0; j < rolesIds.length; j++) {
        // check if the role id for that channel matches the entitlement role id
        // and if the permission matches the role permission
        if (
          rolesIds[j] == roleId &&
          _validateRolePermission(rolesIds[j], permission)
        ) {
          _entitled = true;
        }
      }
    }
  }

  /// @notice gets all the roles given to specific users
  /// @param wallets the array of user addresses
  /// @return roles the array of roles these users have, may include duplicates
  function _getRoleIdsByUser(
    address[] memory wallets
  ) internal view returns (uint256[] memory) {
    uint256 totalLength = 0;

    // Calculate total length
    for (uint256 i = 0; i < wallets.length; i++) {
      totalLength += roleIdsByUser[wallets[i]].length;
    }

    totalLength += roleIdsByUser[EVERYONE_ADDRESS].length;

    // Create an array to hold all roles
    uint256[] memory roles = new uint256[](totalLength);
    uint256 currentIndex = 0;

    // Populate the roles array
    for (uint256 i = 0; i < wallets.length; i++) {
      uint256[] memory rolesForWallet = roleIdsByUser[wallets[i]];
      for (uint256 j = 0; j < rolesForWallet.length; j++) {
        roles[currentIndex++] = rolesForWallet[j];
      }
    }

    uint256[] memory rolesForEveryone = roleIdsByUser[EVERYONE_ADDRESS];
    for (uint256 j = 0; j < rolesForEveryone.length; j++) {
      roles[currentIndex++] = rolesForEveryone[j];
    }

    return roles;
  }

  /// @notice checks if a user is entitled to a specific space
  /// @param wallets the user address
  /// @param permission the permission we are checking for
  /// @return _entitled true if the user is entitled to the space
  function _isEntitledToSpace(
    address[] memory wallets,
    bytes32 permission
  ) internal view returns (bool) {
    // get all the roleids for the user
    uint256[] memory rolesIds = _getRoleIdsByUser(wallets);

    for (uint256 i = 0; i < rolesIds.length; i++) {
      if (_validateRolePermission(rolesIds[i], permission)) {
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
    string[] memory permissions = IRoles(SPACE_ADDRESS).getPermissionsByRoleId(
      roleId
    );
    uint256 permissionLen = permissions.length;

    for (uint256 i = 0; i < permissionLen; i++) {
      bytes32 permissionBytes = bytes32(abi.encodePacked(permissions[i]));
      if (permissionBytes == permission) {
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

  function _removeRoleIdFromUser(address user, uint256 roleId) internal {
    uint256[] storage roles = roleIdsByUser[user];
    for (uint256 i = 0; i < roles.length; i++) {
      if (roles[i] == roleId) {
        roles[i] = roles[roles.length - 1];
        roles.pop();
        return;
      }
    }

    // Optional: Revert if the roleId is not found
    revert("Role ID not found for the user");
  }

  /**
   * @dev Added to allow future versions to add new variables in case this contract becomes
   *      inherited. See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
   */
  uint256[49] private __gap;
}
