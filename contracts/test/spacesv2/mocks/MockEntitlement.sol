// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {IEntitlement} from "contracts/src/spacesv2/interfaces/IEntitlement.sol";

import {ERC165Upgradeable} from "openzeppelin-contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {Initializable} from "openzeppelin-contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import {DataTypes} from "contracts/src/spacesv2/libraries/DataTypes.sol";

contract MockEntitlement is
  Initializable,
  ERC165Upgradeable,
  OwnableUpgradeable,
  UUPSUpgradeable,
  IEntitlement
{
  string public constant name = "Mock Entitlement";
  string public constant description = "Entitlement for kicks";
  string public constant moduleType = "MockEntitlement";

  function initialize() public initializer {
    __UUPSUpgradeable_init();
    __ERC165_init();
    __Ownable_init();
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
    bytes calldata entitlementData
  ) external pure returns (bytes32 entitlementId) {
    return keccak256(abi.encodePacked(roleId, entitlementData));
  }

  function removeEntitlement(
    uint256 roleId,
    bytes calldata entitlementData
  ) external pure returns (bytes32 entitlementId) {
    return keccak256(abi.encodePacked(roleId, entitlementData));
  }

  function addRoleIdToChannel(string calldata, uint256) external pure {
    return;
  }

  function removeRoleIdFromChannel(string calldata, uint256) external pure {
    return;
  }

  function getEntitlementDataByRoleId(
    uint256
  ) external pure returns (bytes[] memory) {
    bytes[] memory entitlementData = new bytes[](0);
    return entitlementData;
  }

  function getUserRoles(
    address
  ) external pure returns (DataTypes.Role[] memory) {
    DataTypes.Role[] memory roles = new DataTypes.Role[](0);

    return roles;
  }
}
