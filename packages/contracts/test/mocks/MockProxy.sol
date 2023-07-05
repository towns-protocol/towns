// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IDiamondLoupe} from "contracts/src/diamond/facets/loupe/IDiamondLoupe.sol";

// contracts
import {Proxy} from "contracts/src/diamond/proxy/Proxy.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";

contract MockProxy is OwnableBase, Proxy {
  address internal immutable _implementation;

  constructor(address implementation_) {
    _implementation = implementation_;
    __Ownable_init();
  }

  function _getImplementation() internal view override returns (address) {
    return IDiamondLoupe(_implementation).facetAddress(msg.sig);
  }
}
