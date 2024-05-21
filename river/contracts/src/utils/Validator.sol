// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
error Validator__InvalidStringLength();
error Validator__InvalidByteLength();
error Validator__InvalidAddress();

library Validator {
  function checkStringLength(string memory name) internal pure {
    bytes memory byteName = bytes(name);
    if (byteName.length == 0) revert Validator__InvalidStringLength();
  }

  function checkLength(string memory name, uint min) internal pure {
    bytes memory byteName = bytes(name);
    if (byteName.length < min) revert Validator__InvalidStringLength();
  }

  function checkByteLength(bytes memory name) internal pure {
    if (name.length == 0) revert Validator__InvalidByteLength();
  }

  function checkAddress(address addr) internal pure {
    if (addr == address(0)) revert Validator__InvalidAddress();
  }
}
