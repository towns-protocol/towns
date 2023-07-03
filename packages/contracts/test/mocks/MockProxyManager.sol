// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts
import {ProxyManager} from "contracts/src/diamond/proxy/manager/ProxyManager.sol";
import {OwnableController} from "contracts/src/diamond/extensions/ownable/OwnableController.sol";

contract MockProxyManager is OwnableController, ProxyManager {
  function init(address implementation) external {
    __ProxyManagerUpgradeable_init(implementation);
    __Ownable_init();
  }
}
