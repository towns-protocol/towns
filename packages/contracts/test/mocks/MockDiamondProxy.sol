// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamondLoupe} from "contracts/src/diamond/extensions/loupe/IDiamondLoupe.sol";

// contracts
import {Proxy} from "contracts/src/diamond/proxy/Proxy.sol";

// services
import {OwnableService} from "contracts/src/diamond/extensions/ownable/OwnableService.sol";

contract MockDiamondProxy is Proxy {
  address internal immutable _implementation;

  constructor(address implementation_) {
    _implementation = implementation_;
    OwnableService.transferOwnership(msg.sender);
  }

  function _getImplementation() internal view override returns (address) {
    return IDiamondLoupe(_implementation).facetAddress(msg.sig);
  }
}
