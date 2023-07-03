// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamondLoupe} from "contracts/src/diamond/extensions/loupe/IDiamondLoupe.sol";

// libraries
import {ProxyManagerService} from "./ProxyManagerService.sol";

// contracts

abstract contract ProxyManagerController {
  function __ProxyManagerUpgradeable_init(address implementation) internal {
    ProxyManagerService.setImplementation(implementation);
  }

  function _getImplementation(
    bytes4 selector
  ) internal view virtual returns (address) {
    address implementation = ProxyManagerService.getImplementation();

    address facet = IDiamondLoupe(implementation).facetAddress(selector);
    if (facet == address(0)) return implementation;
    return facet;
  }

  function _setImplementation(address implementation) internal {
    ProxyManagerService.setImplementation(implementation);
  }
}
