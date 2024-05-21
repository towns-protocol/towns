// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library DispatcherStorage {
  // keccak256(abi.encode(uint256(keccak256("spaces.facets.dispatcher.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0x34516f6fe09a043d57f1ff579a303a7ae85314751c77b4eb1a55837604a86e00;

  // transactionData {
  //   bytes data
  //   uint256 count
  // }

  struct Layout {
    mapping(bytes32 => uint256) transactionNonce;
    mapping(bytes32 => uint256) transactionBalance;
    mapping(bytes32 => bytes) transactionData;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}
