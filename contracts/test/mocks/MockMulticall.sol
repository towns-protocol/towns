// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {Multicall} from "contracts/src/diamond/utils/multicall/Multicall.sol";

contract MockMulticall is Multicall {
  function one() external pure returns (uint256) {
    return 1;
  }

  function two() external pure returns (uint256) {
    return 2;
  }
}
