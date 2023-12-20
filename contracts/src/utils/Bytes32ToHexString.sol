// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

library Bytes32ToHexString {
  // Hex character lookup table
  bytes constant HEX_SYMBOLS = bytes("0123456789abcdef");

  function bytes32ToHexString(
    bytes32 data
  ) public pure returns (string memory) {
    bytes memory result = new bytes(64);

    for (uint256 i = 0; i < 32; i++) {
      bytes1 b = data[i];
      bytes1 hi = bytes1(uint8(b) / 16);
      bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
      result[2 * i] = HEX_SYMBOLS[uint8(hi)];
      result[2 * i + 1] = HEX_SYMBOLS[uint8(lo)];
    }

    return string(result);
  }
}
