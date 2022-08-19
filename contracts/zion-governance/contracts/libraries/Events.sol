// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

library Events {
  /// @notice emitted when an NFT is minted
  /// @param recipient the address that receives the NFT
  event Minted(address indexed recipient);
}
