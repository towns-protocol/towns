//SPDX-License-Identifier: Apache-2.0

/******************************************************************************
 * Copyright 2022 Here Not There, Inc. <oss@hntlabs.com>                      *
 *                                                                            *
 * Licensed under the Apache License, Version 2.0 (the "License");            *
 * you may not use this file except in compliance with the License.           *
 * You may obtain a copy of the License at                                    *
 *                                                                            *
 *     http://www.apache.org/licenses/LICENSE-2.0                             *
 *                                                                            *
 * Unless required by applicable law or agreed to in writing, software        *
 * distributed under the License is distributed on an "AS IS" BASIS,          *
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.   *
 * See the License for the specific language governing permissions and        *
 * limitations under the License.                                             *
 ******************************************************************************/
pragma solidity ^0.8.0;

import "ds-test/test.sol";
import "forge-std/Vm.sol";
import "src/NodeManager.sol";

contract NodeManagerTest is DSTest {
    NodeManager public hello;
    Vm vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    function setUp() public {
        hello = new NodeManager();
    }

    function testsupportsInterface() public {
        assertTrue(
            hello.supportsInterface(
                type(IERC1822ProxiableUpgradeable).interfaceId
            )
        );
        assertTrue(
            hello.supportsInterface(type(IAccessControlUpgradeable).interfaceId)
        );
    }

    function testsupportsInterfaceFuzzed(bytes4 _interfaceId) public {
        vm.assume(
            _interfaceId != type(IERC1822ProxiableUpgradeable).interfaceId
        );
        vm.assume(_interfaceId != type(IAccessControlUpgradeable).interfaceId);

        assertTrue(!hello.supportsInterface(_interfaceId));
    }

    function testgetContractVersion() public {
        assertEq(hello.getContractVersion(), 1);
    }

    /*
    Simple test to play around with warp and assume cheat codes
    function testWarp(uint8 _timestamp) public {
        vm.assume(_timestamp == 0);
        assertEq(block.timestamp, _timestamp);
        vm.warp(100);
        assertEq(block.timestamp, _timestamp + 100);
    }
    */
}
