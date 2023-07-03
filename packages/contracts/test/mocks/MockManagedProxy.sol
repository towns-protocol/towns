// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries

// contracts
import {ManagedProxyController} from "contracts/src/diamond/proxy/managed/ManagedProxyController.sol";
import {OwnableService} from "contracts/src/diamond/extensions/ownable/OwnableService.sol";

contract MockManagedProxy is ManagedProxyController {
  constructor(bytes4 selector, address manager) {
    __ManagedProxy_init(selector, manager);
    OwnableService.transferOwnership(msg.sender);
  }

  function init(bytes4 selector, address manager) external {
    __ManagedProxy_init(selector, manager);
  }

  function setManager(address manager) external {
    _setManager(manager);
  }

  function setManagerSelector(bytes4 managerSelector) external {
    _setManagerSelector(managerSelector);
  }

  receive() external payable {}
}
