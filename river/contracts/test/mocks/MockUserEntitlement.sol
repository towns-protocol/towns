// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IEntitlement} from "contracts/src/spaces/entitlements/IEntitlement.sol";
import {IRoles} from "contracts/src/spaces/facets/roles/IRoles.sol";

import {MockUserEntitlementStorage} from "./MockUserEntitlementStorage.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract MockUserEntitlement is
  Initializable,
  ERC165Upgradeable,
  ContextUpgradeable,
  UUPSUpgradeable,
  IEntitlement
{
  using EnumerableSet for EnumerableSet.Bytes32Set;
  using EnumerableSet for EnumerableSet.UintSet;
  using MockUserEntitlementStorage for MockUserEntitlementStorage.Layout;

  string public constant name = "Mock Entitlement";
  string public constant description = "Entitlement for kicks";
  string public constant moduleType = "MockUserEntitlement";

  address public SPACE_ADDRESS;

  modifier onlySpace() {
    if (_msgSender() != SPACE_ADDRESS) {
      revert Entitlement__NotAllowed();
    }
    _;
  }

  function initialize(address _space) public initializer {
    __UUPSUpgradeable_init();
    __ERC165_init();
    __Context_init();

    SPACE_ADDRESS = _space;
  }

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

  function isCrosschain() external pure returns (bool) {
    return false;
  }

  function isEntitled(
    bytes32,
    address[] memory,
    bytes32
  ) external pure returns (bool) {
    return true;
  }

  function setEntitlement(
    uint256 roleId,
    bytes memory entitlementData
  ) external onlySpace {
    MockUserEntitlementStorage.Layout storage ds = MockUserEntitlementStorage
      .layout();

    address[] memory users = abi.decode(entitlementData, (address[]));

    if (users.length == 0) {
      // use remove entitlement instead
      revert Entitlement__InvalidValue();
    }

    for (uint256 i = 0; i < users.length; i++) {
      address user = users[i];
      if (user == address(0)) {
        revert Entitlement__InvalidValue();
      }
    }

    // First remove any prior values
    while (ds.entitlementsByRoleId[roleId].users.length > 0) {
      address user = ds.entitlementsByRoleId[roleId].users[
        ds.entitlementsByRoleId[roleId].users.length - 1
      ];
      _removeRoleIdFromUser(user, roleId);
      ds.entitlementsByRoleId[roleId].users.pop();
    }
    delete ds.entitlementsByRoleId[roleId];
    ds.entitlementsByRoleId[roleId] = MockUserEntitlementStorage.Entitlement({
      roleId: roleId,
      data: entitlementData,
      users: users
    });
    for (uint256 i = 0; i < users.length; i++) {
      ds.roleIdsByUser[users[i]].push(roleId);
    }
  }

  function removeEntitlement(uint256 roleId) external onlySpace {
    MockUserEntitlementStorage.Layout storage ds = MockUserEntitlementStorage
      .layout();

    // First remove any prior values
    while (ds.entitlementsByRoleId[roleId].users.length > 0) {
      address user = ds.entitlementsByRoleId[roleId].users[
        ds.entitlementsByRoleId[roleId].users.length - 1
      ];
      _removeRoleIdFromUser(user, roleId);
      ds.entitlementsByRoleId[roleId].users.pop();
    }
    delete ds.entitlementsByRoleId[roleId];
  }

  function addRoleIdToChannel(
    string memory channelId,
    uint256 roleId
  ) external onlySpace {
    MockUserEntitlementStorage.Layout storage ds = MockUserEntitlementStorage
      .layout();

    ds.roleIdsByChannelId[channelId].add(roleId);
  }

  function removeRoleIdFromChannel(
    string memory channelId,
    uint256 roleId
  ) external onlySpace {
    MockUserEntitlementStorage.Layout storage ds = MockUserEntitlementStorage
      .layout();

    ds.roleIdsByChannelId[channelId].remove(roleId);
  }

  function getRoleIdsByChannelId(
    string memory channelId
  ) external view returns (uint256[] memory roleIds) {
    MockUserEntitlementStorage.Layout storage ds = MockUserEntitlementStorage
      .layout();

    return ds.roleIdsByChannelId[channelId].values();
  }

  function getEntitlementDataByRoleId(
    uint256 roleId
  ) external view returns (bytes memory) {
    MockUserEntitlementStorage.Layout storage ds = MockUserEntitlementStorage
      .layout();

    return abi.encode(ds.entitlementsByRoleId[roleId].users);
  }

  function getUserRoles(address) external pure returns (IRoles.Role[] memory) {
    IRoles.Role[] memory roles = new IRoles.Role[](0);
    return roles;
  }

  function _removeRoleIdFromUser(address user, uint256 roleId) internal {
    MockUserEntitlementStorage.Layout storage ds = MockUserEntitlementStorage
      .layout();

    uint256[] storage roles = ds.roleIdsByUser[user];
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
}
