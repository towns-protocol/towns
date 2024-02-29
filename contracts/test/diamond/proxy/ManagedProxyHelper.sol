// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IManagedProxy} from "contracts/src/diamond/proxy/managed/IManagedProxy.sol";

// libraries

// helpers
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {ManagedProxyFacet} from "contracts/src/diamond/proxy/managed/ManagedProxyFacet.sol";

contract ManagedProxyHelper is FacetHelper {
  ManagedProxyFacet internal proxy;

  constructor() {
    proxy = new ManagedProxyFacet();
  }

  function facet() public view override returns (address) {
    return address(proxy);
  }

  function selectors() public pure override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](2);
    selectors_[0] = IManagedProxy.setManager.selector;
    selectors_[1] = IManagedProxy.getManager.selector;
    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return ManagedProxyFacet.__ManagedProxy_init.selector;
  }
}
