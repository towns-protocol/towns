// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {ManagedProxyBase} from "contracts/src/diamond/proxy/managed/ManagedProxyBase.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";
import {IntrospectionBase} from "contracts/src/diamond/facets/introspection/IntrospectionBase.sol";

contract MockOwnableManagedProxy is
  ManagedProxyBase,
  OwnableBase,
  IntrospectionBase
{
  receive() external payable {
    revert("MockOwnableManagedProxy: cannot receive ether");
  }

  constructor(bytes4 managerSelector, address manager) {
    __ManagedProxyBase_init(ManagedProxy(managerSelector, manager));
    _transferOwnership(msg.sender);
  }

  function dangerous_addInterface(bytes4 interfaceId) external onlyOwner {
    _addInterface(interfaceId);
  }
}
