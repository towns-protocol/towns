// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

//interfaces

//libraries

//contracts
import {MockMulticall} from "contracts/test/mocks/MockMulticall.sol";

contract MulticallTest is TestUtils {
  MockMulticall internal mockMulticall = new MockMulticall();

  function test_multicall() external {
    bytes[] memory data = new bytes[](2);

    data[0] = abi.encodeWithSelector(MockMulticall.one.selector);
    data[1] = abi.encodeWithSelector(MockMulticall.two.selector);

    bytes[] memory results = mockMulticall.multicall(data);

    assertEq(results.length, 2);
    assertEq(abi.decode(results[0], (uint256)), 1);
    assertEq(abi.decode(results[1], (uint256)), 2);
  }

  function test_fuzz_multicall(bytes[] memory data) external {
    bytes[] memory results = mockMulticall.multicall(data);
    for (uint256 i; i < results.length; ++i) {
      assertEq(results[i], data[i]);
    }
  }
}
