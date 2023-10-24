// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts
import {ManagedProxyBase} from "./ManagedProxyBase.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";

contract ManagedProxy is ManagedProxyBase, OwnableBase {
  constructor(bytes4 managerSelector, address manager) {
    __ManagedProxyBase_init(ManagedProxyInit(managerSelector, manager));
    _transferOwnership(msg.sender);
  }
}
