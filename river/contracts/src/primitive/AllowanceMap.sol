/// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

using AllowanceLib for AllowanceMap global;

struct AllowanceMap {
  mapping(address account => mapping(address spender => uint256)) inner;
}

library AllowanceLib {
  function slot(
    AllowanceMap storage self,
    address account,
    address spender
  ) internal pure returns (uint256 _slot) {
    assembly ("memory-safe") {
      mstore(0, account)
      mstore(0x20, self.slot)
      mstore(0x20, keccak256(0, 0x40))
      mstore(0, spender)
      _slot := keccak256(0, 0x40)
    }
  }

  function get(
    AllowanceMap storage self,
    address account,
    address spender
  ) internal view returns (uint256 allowance) {
    uint256 _slot = self.slot(account, spender);
    assembly ("memory-safe") {
      allowance := sload(_slot)
    }
  }

  function set(
    AllowanceMap storage self,
    address account,
    address spender,
    uint256 allowance
  ) internal {
    uint256 _slot = self.slot(account, spender);
    assembly ("memory-safe") {
      sstore(_slot, allowance)
    }
  }
}
