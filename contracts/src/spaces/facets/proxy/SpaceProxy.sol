// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {ManagedProxyBase} from "@towns-protocol/diamond/src/proxy/managed/ManagedProxyBase.sol";
import {Multicallable} from "solady/utils/Multicallable.sol";

contract SpaceProxy is ManagedProxyBase, Multicallable {
    constructor(ManagedProxy memory init, address initializer, bytes memory data) {
        __ManagedProxyBase_init(init);
        Address.functionDelegateCall(initializer, data);
    }

    receive() external payable {}
}
