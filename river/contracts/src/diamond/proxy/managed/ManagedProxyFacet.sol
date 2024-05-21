// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IManagedProxy} from "./IManagedProxy.sol";

// libraries

// contracts
import {ManagedProxyStorage} from "contracts/src/diamond/proxy/managed/ManagedProxyStorage.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract ManagedProxyFacet is IManagedProxy, OwnableBase, Facet {
  function __ManagedProxy_init() external onlyInitializing {
    _addInterface(type(IManagedProxy).interfaceId);
  }

  function getManager() external view returns (address) {
    return ManagedProxyStorage.layout().manager;
  }

  function setManager(address manager) external onlyOwner {
    if (manager == address(0)) revert ManagedProxy__InvalidManager();
    ManagedProxyStorage.layout().manager = manager;
  }
}
