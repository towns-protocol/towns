// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries

// contracts
import {ProxyManager} from "contracts/src/diamond/proxy/manager/ProxyManager.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";

contract MockProxyManager is OwnableBase, ProxyManager {
  function init(address implementation) external {
    __ProxyManagerUpgradeable_init(implementation);
    __Ownable_init();
  }
}
