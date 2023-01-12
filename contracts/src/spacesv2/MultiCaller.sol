// This contract is taken from Uniswap's multi call implementation (https://github.com/Uniswap/uniswap-v3-periphery/blob/main/contracts/base/Multicall.sol)
// and was modified to be solidity 0.8 compatible. Additionally, the method was restricted to only work with msg.value
// set to 0 to avoid any nasty attack vectors on function calls that use value sent with deposits.
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
