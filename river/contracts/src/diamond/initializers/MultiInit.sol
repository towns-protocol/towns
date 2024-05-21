// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces

// libraries
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

// contracts

error AddressAndCalldataLengthDoNotMatch(
  uint256 _addressesLength,
  uint256 _calldataLength
);

contract MultiInit {
  function multiInit(
    address[] calldata _addresses,
    bytes[] calldata _calldata
  ) external {
    if (_addresses.length != _calldata.length) {
      revert AddressAndCalldataLengthDoNotMatch(
        _addresses.length,
        _calldata.length
      );
    }
    for (uint256 i; i < _addresses.length; i++) {
      if (_calldata.length == 0) continue;
      Address.functionDelegateCall(_addresses[i], _calldata[i]);
    }
  }
}
