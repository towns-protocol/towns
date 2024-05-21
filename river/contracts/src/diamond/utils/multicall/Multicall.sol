// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IMulticall} from "./IMulticall.sol";

/// @title Utility contract for supporting processing of multiple function calls in a single transaction
abstract contract Multicall is IMulticall {
  /// @inheritdoc IMulticall
  function multicall(
    bytes[] calldata data
  ) external returns (bytes[] memory results) {
    uint256 dataLen = data.length;

    results = new bytes[](dataLen);

    for (uint256 i; i < dataLen; ) {
      (bool success, bytes memory returndata) = address(this).delegatecall(
        data[i]
      );

      if (success) {
        results[i] = returndata;
      } else {
        assembly {
          returndatacopy(0, 0, returndatasize())
          revert(0, returndatasize())
        }
      }

      unchecked {
        i++;
      }
    }

    return results;
  }
}
