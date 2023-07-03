// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

import {Errors} from "./Errors.sol";

library Utils {
  uint8 internal constant MIN_NAME_LENGTH = 2;
  uint8 internal constant MAX_NAME_LENGTH = 32;
  address public constant EVERYONE_ADDRESS =
    0x0000000000000000000000000000000000000001;

  function isEqual(
    string memory s1,
    string memory s2
  ) internal pure returns (bool) {
    return keccak256(abi.encode(s1)) == keccak256(abi.encode(s2));
  }

  function bytes32ToString(
    bytes32 _bytes32
  ) public pure returns (string memory) {
    uint8 i = 0;
    while (i < 32 && _bytes32[i] != 0) {
      i++;
    }
    bytes memory bytesArray = new bytes(i);
    for (i = 0; i < 32 && _bytes32[i] != 0; i++) {
      bytesArray[i] = _bytes32[i];
    }
    return string(bytesArray);
  }

  function validateLength(string memory name) internal pure {
    bytes memory byteName = bytes(name);
    if (byteName.length < MIN_NAME_LENGTH || byteName.length > MAX_NAME_LENGTH)
      revert Errors.NameLengthInvalid();
  }
}
