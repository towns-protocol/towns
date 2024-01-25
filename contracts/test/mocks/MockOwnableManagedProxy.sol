// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts
import {ManagedProxyBase} from "contracts/src/diamond/proxy/managed/ManagedProxyBase.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";

contract MockOwnableManagedProxy is ManagedProxyBase, OwnableBase {
  constructor(bytes4 managerSelector, address manager) {
    __ManagedProxyBase_init(ManagedProxyInit(managerSelector, manager));
    _transferOwnership(msg.sender);
  }
}
