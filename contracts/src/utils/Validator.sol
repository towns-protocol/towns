// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
error Validator__InvalidStringLength();
error Validator__InvalidByteLength();
error Validator__InvalidAddress();
error Validator__InvalidLength();
error Validator__InvalidMaxLength(uint256 max);

library Validator {
  function checkStringLength(string memory name) internal pure {
    bytes memory byteName = bytes(name);
    if (byteName.length == 0) revert Validator__InvalidStringLength();
  }

  function checkLength(string memory name, uint256 min) internal pure {
    bytes memory byteName = bytes(name);
    if (byteName.length < min) revert Validator__InvalidStringLength();
  }

  function checkMaxLength(string memory name, uint256 max) internal pure {
    bytes memory byteName = bytes(name);
    if (byteName.length > max) revert Validator__InvalidMaxLength(max);
  }

  function checkByteLength(bytes memory name) internal pure {
    if (name.length == 0) revert Validator__InvalidByteLength();
  }

  function checkAddress(address addr) internal pure {
    if (addr == address(0)) revert Validator__InvalidAddress();
  }

  function checkMaxArrayLength(
    string[] memory array,
    uint256 maxLength
  ) internal pure {
    if (array.length > maxLength) revert Validator__InvalidLength();
  }
}
