// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

import {IntrospectionBase} from "@towns-protocol/diamond/src/facets/introspection/IntrospectionBase.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {ManagedProxyBase} from "@towns-protocol/diamond/src/proxy/managed/ManagedProxyBase.sol";

contract MockOwnableManagedProxy is ManagedProxyBase, OwnableBase, IntrospectionBase {
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
