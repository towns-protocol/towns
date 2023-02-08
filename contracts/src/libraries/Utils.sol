// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

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
    return keccak256(abi.encodePacked(s1)) == keccak256(abi.encodePacked(s2));
  }

  function validateLength(string memory name) internal pure {
    bytes memory byteName = bytes(name);
    if (byteName.length < MIN_NAME_LENGTH || byteName.length > MAX_NAME_LENGTH)
      revert Errors.NameLengthInvalid();
  }

  /// @notice validates the name of the space
  /// @param name The name of the space
  function validateName(string calldata name) internal pure {
    bytes memory byteName = bytes(name);

    if (byteName.length < MIN_NAME_LENGTH || byteName.length > MAX_NAME_LENGTH)
      revert Errors.NameLengthInvalid();

    uint256 byteNameLength = byteName.length;
    for (uint256 i = 0; i < byteNameLength; ) {
      if (
        (byteName[i] < "0" ||
          byteName[i] > "z" ||
          (byteName[i] > "9" && byteName[i] < "a")) &&
        byteName[i] != "." &&
        byteName[i] != "-" &&
        byteName[i] != "_" &&
        byteName[i] != " "
      ) revert Errors.NameContainsInvalidCharacters();
      unchecked {
        ++i;
      }
    }
  }
}
