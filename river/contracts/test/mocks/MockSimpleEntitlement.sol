// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IEntitlement} from "contracts/src/spaces/entitlements/IEntitlement.sol";

import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract MockSimpleEntitlement is
  Initializable,
  ERC165Upgradeable,
  ContextUpgradeable,
  UUPSUpgradeable,
  IEntitlement
{
  mapping(address => bool) internal entitledToSpace;
  mapping(uint256 => address) internal nameMap;

  string public constant name = "Mock Entitlement";
  string public constant description = "Entitlement for kicks";
  string public constant moduleType = "MockSimpleEntitlement";

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
    address[] memory wallets,
    bytes32
  ) external view returns (bool) {
    for (uint256 i = 0; i < wallets.length; i++) {
      if (entitledToSpace[wallets[i]]) {
        return true;
      }
    }
    return false;
  }

  function setEntitlement(
    uint256 roleId,
    bytes memory entitlementData
  ) external onlySpace {
    address user = abi.decode(entitlementData, (address));
    entitledToSpace[user] = true;
    nameMap[roleId] = user;
  }

  function removeEntitlement(uint256 roleId) external onlySpace {
    entitledToSpace[nameMap[roleId]] = false;
  }

  function getEntitlementDataByRoleId(
    uint256
  ) external pure returns (bytes memory) {
    return new bytes(0);
  }
}
