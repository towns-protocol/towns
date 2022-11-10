//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {ERC165} from "openzeppelin-contracts/contracts/utils/introspection/ERC165.sol";
import {Errors} from "../libraries/Errors.sol";
import {IEntitlementModule} from "../interfaces/IEntitlementModule.sol";

abstract contract EntitlementModuleBase is ERC165, IEntitlementModule {
  address public immutable _spaceManager;
  address public immutable _roleManager;
  address public immutable _permisionRegistry;

  string public name;
  string public description;
  string public moduleType;

  modifier onlySpaceManager() {
    if (msg.sender != _spaceManager) revert Errors.NotSpaceManager();
    _;
  }

  constructor(
    string memory name_,
    string memory description_,
    string memory moduleType_,
    address spaceManager_,
    address roleManager_,
    address permissionRegistry_
  ) {
    _verifyParameters(spaceManager_);

    name = name_;
    description = description_;
    moduleType = moduleType_;
    _spaceManager = spaceManager_;
    _roleManager = roleManager_;
    _permisionRegistry = permissionRegistry_;
  }

  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(ERC165) returns (bool) {
    return
      interfaceId == type(IEntitlementModule).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  function _verifyParameters(address value) internal pure {
    if (value == address(0)) {
      revert Errors.InvalidParameters();
    }
  }
}
