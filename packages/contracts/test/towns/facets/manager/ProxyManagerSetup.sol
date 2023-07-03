// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries

// contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {ProxyManager} from "contracts/src/diamond/proxy/manager/ProxyManager.sol";

contract ProxyManagerHelper is FacetHelper {
  ProxyManager internal proxyManager;

  constructor() {
    proxyManager = new ProxyManager();
  }

  function facet() public view override returns (address) {
    return address(proxyManager);
  }

  function selectors() public view override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](2);
    selectors_[0] = proxyManager.getImplementation.selector;
    selectors_[1] = proxyManager.setImplementation.selector;
    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return "";
  }

  function makeInitData(
    bytes memory initData
  ) public view override returns (address, bytes memory data) {
    address proxyImplementation = abi.decode(initData, (address));

    return (
      facet(),
      abi.encodeWithSelector(initializer(), proxyImplementation)
    );
  }
}
