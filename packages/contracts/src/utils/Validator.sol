// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries

// contracts
error Validator__InvalidStringLength();
error Validator__InvalidByteLength();

library Validator {
  function checkLength(string memory name, uint min) internal pure {
    bytes memory byteName = bytes(name);
    if (byteName.length < min) revert Validator__InvalidStringLength();
  }

  function checkByteLength(bytes memory name) internal pure {
    if (name.length == 0) revert Validator__InvalidByteLength();
  }
}
