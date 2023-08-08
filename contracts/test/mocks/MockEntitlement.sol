// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

import {IEntitlement} from "contracts/src/spaces/interfaces/IEntitlement.sol";
import {IERC721} from "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";

import {MockEntitlementStorage} from "./MockEntitlementStorage.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";

import {ERC165Upgradeable} from "openzeppelin-contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {Initializable} from "openzeppelin-contracts-upgradeable/proxy/utils/Initializable.sol";
import {ContextUpgradeable} from "openzeppelin-contracts-upgradeable/utils/ContextUpgradeable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// debuggging
import {console} from "forge-std/console.sol";

contract MockEntitlement is
  Initializable,
  ERC165Upgradeable,
  ContextUpgradeable,
  UUPSUpgradeable,
  IEntitlement
{
  using EnumerableSet for EnumerableSet.Bytes32Set;
  using MockEntitlementStorage for MockEntitlementStorage.Layout;

  string public constant name = "Mock Entitlement";
  string public constant description = "Entitlement for kicks";
  string public constant moduleType = "MockEntitlement";

  address public TOKEN_ADDRESS;
  uint256 public TOKEN_ID;

  modifier onlyOwner() {
    require(
      IERC721(TOKEN_ADDRESS).ownerOf(TOKEN_ID) == _msgSender(),
      "Space: only owner"
    );
    _;
  }

  function initialize(
    address _tokenAddress,
    uint256 _tokenId
  ) public initializer {
    __UUPSUpgradeable_init();
    __ERC165_init();
    __Context_init();

    TOKEN_ADDRESS = _tokenAddress;
    TOKEN_ID = _tokenId;
  }

  function _authorizeUpgrade(
    address newImplementation
  ) internal override onlyOwner {}

  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override returns (bool) {
    return
      interfaceId == type(IEntitlement).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  function setSpace(address) external pure {
    return;
  }

  function isEntitled(
    string calldata,
    address,
    bytes32
  ) external pure returns (bool) {
    return true;
  }

  function getEntitlementDataByEntitlementId(
    bytes32
  ) external pure returns (bytes memory) {
    return bytes("");
  }

  function setEntitlement(
    uint256 roleId,
    bytes memory entitlementData
  ) external returns (bytes32 entitlementId) {
    entitlementId = keccak256(abi.encodePacked(roleId, entitlementData));

    MockEntitlementStorage.Layout storage ds = MockEntitlementStorage.layout();

    ds.entitlementIds.add(entitlementId);
    ds.entitlementIdsByRoleId[roleId].add(entitlementId);
    ds.entitlementsById[entitlementId] = MockEntitlementStorage.Entitlement({
      roleId: roleId,
      data: entitlementData
    });
  }

  function removeEntitlement(
    uint256 roleId,
    bytes calldata entitlementData
  ) external returns (bytes32 entitlementId) {
    entitlementId = keccak256(abi.encodePacked(roleId, entitlementData));

    MockEntitlementStorage.Layout storage ds = MockEntitlementStorage.layout();

    ds.entitlementIds.remove(entitlementId);
    ds.entitlementIdsByRoleId[roleId].remove(entitlementId);
    delete ds.entitlementsById[entitlementId];

    return entitlementId;
  }

  function addRoleIdToChannel(string calldata, uint256) external pure {
    return;
  }

  function removeRoleIdFromChannel(string calldata, uint256) external pure {
    return;
  }

  function getRoleIdsByChannelId(
    string calldata
  ) external pure returns (uint256[] memory roleIds) {
    return new uint256[](0);
  }

  function getEntitlementDataByRoleId(
    uint256 roleId
  ) external view returns (bytes[] memory) {
    MockEntitlementStorage.Layout storage ds = MockEntitlementStorage.layout();

    uint256 length = ds.entitlementIdsByRoleId[roleId].length();

    console.log("length: %s", length);

    bytes[] memory entitlementData = new bytes[](length);

    for (uint256 i = 0; i < length; i++) {
      entitlementData[i] = ds
        .entitlementsById[ds.entitlementIdsByRoleId[roleId].at(i)]
        .data;
    }

    return entitlementData;
  }

  function getUserRoles(
    address
  ) external pure returns (DataTypes.Role[] memory) {
    DataTypes.Role[] memory roles = new DataTypes.Role[](0);

    return roles;
  }
}
