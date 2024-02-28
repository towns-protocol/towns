// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.23;

import {IEntitlement} from "contracts/src/spaces/entitlements/IEntitlement.sol";
import {IRoles} from "contracts/src/spaces/facets/roles/IRoles.sol";

import {MockUserEntitlementStorage} from "./MockUserEntitlementStorage.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {ERC165Upgradeable} from "openzeppelin-contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {Initializable} from "openzeppelin-contracts-upgradeable/proxy/utils/Initializable.sol";
import {ContextUpgradeable} from "openzeppelin-contracts-upgradeable/utils/ContextUpgradeable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

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

  modifier onlyTown() {
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
  ) internal override onlyTown {}

  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override returns (bool) {
    return
      interfaceId == type(IEntitlement).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  function isEntitled(
    string calldata,
    address,
    bytes32
  ) external pure returns (bool) {
    return true;
  }

  function getEntitlementDataByEntitlementId(
    bytes32 entitlementId
  ) external view returns (bytes memory) {
    MockUserEntitlementStorage.Layout storage ds = MockUserEntitlementStorage
      .layout();

    return ds.entitlementsById[entitlementId].data;
  }

  function setEntitlement(
    uint256 roleId,
    bytes memory entitlementData
  ) external onlyTown returns (bytes32 entitlementId) {
    entitlementId = keccak256(abi.encodePacked(roleId, entitlementData));

    MockUserEntitlementStorage.Layout storage ds = MockUserEntitlementStorage
      .layout();

    ds.entitlementIds.add(entitlementId);
    ds.entitlementIdsByRoleId[roleId].add(entitlementId);
    ds.entitlementsById[entitlementId] = MockUserEntitlementStorage
      .Entitlement({roleId: roleId, data: entitlementData});
  }

  function removeEntitlement(
    uint256 roleId,
    bytes calldata entitlementData
  ) external onlyTown returns (bytes32 entitlementId) {
    entitlementId = keccak256(abi.encodePacked(roleId, entitlementData));

    MockUserEntitlementStorage.Layout storage ds = MockUserEntitlementStorage
      .layout();

    ds.entitlementIds.remove(entitlementId);
    ds.entitlementIdsByRoleId[roleId].remove(entitlementId);
    delete ds.entitlementsById[entitlementId];

    return entitlementId;
  }

  function addRoleIdToChannel(
    string memory channelId,
    uint256 roleId
  ) external onlyTown {
    MockUserEntitlementStorage.Layout storage ds = MockUserEntitlementStorage
      .layout();

    ds.roleIdsByChannelId[channelId].add(roleId);
  }

  function removeRoleIdFromChannel(
    string memory channelId,
    uint256 roleId
  ) external onlyTown {
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
  ) external view returns (bytes[] memory) {
    MockUserEntitlementStorage.Layout storage ds = MockUserEntitlementStorage
      .layout();

    uint256 length = ds.entitlementIdsByRoleId[roleId].length();

    bytes[] memory entitlementData = new bytes[](length);

    for (uint256 i = 0; i < length; i++) {
      entitlementData[i] = ds
        .entitlementsById[ds.entitlementIdsByRoleId[roleId].at(i)]
        .data;
    }

    return entitlementData;
  }

  function getUserRoles(address) external pure returns (IRoles.Role[] memory) {
    IRoles.Role[] memory roles = new IRoles.Role[](0);
    return roles;
  }
}
