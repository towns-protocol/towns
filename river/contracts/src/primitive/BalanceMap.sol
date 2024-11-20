/// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

using BalanceLib for BalanceMap global;

struct BalanceMap {
  mapping(address account => uint256) inner;
}

library BalanceLib {
  function slot(
    BalanceMap storage self,
    address account
  ) internal pure returns (uint256 _slot) {
    assembly ("memory-safe") {
      mstore(0, account)
      mstore(0x20, self.slot)
      _slot := keccak256(0, 0x40)
    }
  }

  function get(
    BalanceMap storage self,
    address account
  ) internal view returns (uint256 _balance) {
    uint256 _slot = self.slot(account);
    assembly ("memory-safe") {
      _balance := sload(_slot)
    }
  }

  function set(
    BalanceMap storage self,
    address account,
    uint256 _balance
  ) internal {
    uint256 _slot = self.slot(account);
    assembly ("memory-safe") {
      sstore(_slot, _balance)
    }
  }
}
