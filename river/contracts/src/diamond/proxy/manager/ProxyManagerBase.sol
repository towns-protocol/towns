// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamondLoupe} from "contracts/src/diamond/facets/loupe/IDiamondLoupe.sol";
import {IProxyManagerBase} from "./IProxyManager.sol";

// libraries
import {ProxyManagerStorage} from "./ProxyManagerStorage.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

// contracts

abstract contract ProxyManagerBase is IProxyManagerBase {
  function _getImplementation(
    bytes4 selector
  ) internal view virtual returns (address) {
    address implementation = ProxyManagerStorage.layout().implementation;

    address facet = IDiamondLoupe(implementation).facetAddress(selector);
    if (facet == address(0)) return implementation;
    return facet;
  }

  function _setImplementation(address implementation) internal {
    if (implementation.code.length == 0) {
      revert ProxyManager__NotContract(implementation);
    }

    ProxyManagerStorage.layout().implementation = implementation;

    emit ProxyManager__ImplementationSet(implementation);
  }
}
