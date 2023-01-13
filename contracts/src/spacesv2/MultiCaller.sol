// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {Utils} from "./libraries/Utils.sol";

/// @title MultiCaller
/// @notice Enables calling multiple methods in a single call to the contract
abstract contract MultiCaller {
  function multicall(
    bytes[] calldata data
  ) external returns (bytes[] memory results) {
    results = new bytes[](data.length);
    for (uint256 i = 0; i < data.length; i++) {
      (bool success, bytes memory result) = address(this).delegatecall(data[i]);

      if (!success) {
        Utils.revertFromReturnedData(result);
      }

      results[i] = result;
    }
  }
}
