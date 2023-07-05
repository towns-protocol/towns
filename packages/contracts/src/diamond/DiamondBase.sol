// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries
import {Proxy} from "./proxy/Proxy.sol";
import {DiamondLoupeService} from "./facets/loupe/DiamondLoupeService.sol";

// contracts

abstract contract DiamondBase is Proxy {
  function _getImplementation()
    internal
    view
    virtual
    override
    returns (address)
  {
    return DiamondLoupeService.facetAddress(msg.sig);
  }
}
