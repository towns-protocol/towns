// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {Multicallable} from "solady/utils/Multicallable.sol";

contract MockMulticall is Multicallable {
  function one() external pure returns (uint256) {
    return 1;
  }

  function two() external pure returns (uint256) {
    return 2;
  }

  fallback(bytes calldata) external returns (bytes memory) {
    return msg.data;
  }
}
