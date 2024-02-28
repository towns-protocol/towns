// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.23;

import {IEntitlement} from "contracts/src/spaces/entitlements/IEntitlement.sol";

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {ERC165Upgradeable} from "openzeppelin-contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {Initializable} from "openzeppelin-contracts-upgradeable/proxy/utils/Initializable.sol";
import {ContextUpgradeable} from "openzeppelin-contracts-upgradeable/utils/ContextUpgradeable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract MockSimpleEntitlement is
  Initializable,
  ERC165Upgradeable,
  ContextUpgradeable,
  UUPSUpgradeable,
  IEntitlement
{
  mapping(address => bool) internal entitledToTown;

  string public constant name = "Mock Entitlement";
  string public constant description = "Entitlement for kicks";
  string public constant moduleType = "MockSimpleEntitlement";

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
    address user,
    bytes32
  ) external view returns (bool) {
    return entitledToTown[user];
  }

  function setEntitlement(
    uint256 roleId,
    bytes memory entitlementData
  ) external onlyTown returns (bytes32) {
    address user = abi.decode(entitlementData, (address));
    entitledToTown[user] = true;
    return keccak256(abi.encodePacked(roleId, entitlementData));
  }

  function removeEntitlement(
    uint256 roleId,
    bytes calldata entitlementData
  ) external onlyTown returns (bytes32 entitlementId) {
    address user = abi.decode(entitlementData, (address));
    entitledToTown[user] = false;
    entitlementId = keccak256(abi.encodePacked(roleId, entitlementData));
  }

  function getEntitlementDataByRoleId(
    uint256
  ) external pure returns (bytes[] memory) {
    return new bytes[](0);
  }
}
