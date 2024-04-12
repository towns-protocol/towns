// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IManagedProxy} from "contracts/src/diamond/proxy/managed/IManagedProxy.sol";

// libraries

// helpers
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {ManagedProxyFacet} from "contracts/src/diamond/proxy/managed/ManagedProxyFacet.sol";

contract ManagedProxyHelper is FacetHelper {
  constructor() {
    addSelector(IManagedProxy.setManager.selector);
    addSelector(IManagedProxy.getManager.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return ManagedProxyFacet.__ManagedProxy_init.selector;
  }
}
