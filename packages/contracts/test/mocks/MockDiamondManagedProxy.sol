// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamondLoupe} from "contracts/src/diamond/extensions/loupe/IDiamondLoupe.sol";

// libraries

// contracts
import {ManagedProxy} from "contracts/src/diamond/proxy/managed/ManagedProxy.sol";
import {OwnableService} from "contracts/src/diamond/extensions/ownable/OwnableService.sol";

contract MockDiamondManagedProxy is ManagedProxy {
  address internal immutable _manager;

  constructor(address manager, bytes4 selector) ManagedProxy(selector) {
    _manager = manager;
    OwnableService.transferOwnership(msg.sender);
  }

  function _getManager() internal view override returns (address) {
    return _manager;
  }
}
