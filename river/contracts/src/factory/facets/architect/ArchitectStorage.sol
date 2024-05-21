// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// contracts

library ArchitectStorage {
  // keccak256(abi.encode(uint256(keccak256("spaces.facets.architect.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant SLOT_POSITION =
    0x06bd04a817647c31ee485c8a0baab96facd62dbfd4b475796bb17ca2c12f0000;

  struct Layout {
    uint256 spaceCount;
    mapping(address spaceAddress => uint256 tokenId) tokenIdBySpace;
    mapping(uint256 tokenId => address spaceAddress) spaceByTokenId;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 position = SLOT_POSITION;

    // solhint-disable-next-line no-inline-assembly
    assembly {
      ds.slot := position
    }
  }
}
