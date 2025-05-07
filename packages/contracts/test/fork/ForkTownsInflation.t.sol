// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {TestUtils} from "@towns-protocol/diamond/test/TestUtils.sol";

contract ForkTownsInflation is TestUtils {
    function setUp() public {
        vm.createSelectFork(vm.envString("ETH_RPC_URL"));
    }

    function test_createInflation() public {}
}
