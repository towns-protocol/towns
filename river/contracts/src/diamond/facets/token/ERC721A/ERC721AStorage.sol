// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IERC721ABase} from "./IERC721A.sol";

library ERC721AStorage {
  // keccak256(abi.encode(uint256(keccak256("diamond.facets.token.ERC721A.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0x6569bde4a160c636ea8b8d11acb83a60d7fec0b8f2e09389306cba0e1340df00;

  struct Layout {
    // =============================================================
    //                            STORAGE
    // =============================================================

    // The next token ID to be minted.
    uint256 _currentIndex;
    // The number of tokens burned.
    uint256 _burnCounter;
    // Token name
    string _name;
    // Token symbol
    string _symbol;
    // Mapping from token ID to ownership details
    // An empty struct value does not necessarily mean the token is unowned.
    // See {_packedOwnershipOf} implementation for details.
    //
    // Bits Layout:
    // - [0..159]   `addr`
    // - [160..223] `startTimestamp`
    // - [224]      `burned`
    // - [225]      `nextInitialized`
    // - [232..255] `extraData`
    mapping(uint256 => uint256) _packedOwnerships;
    // Mapping owner address to address data.
    //
    // Bits Layout:
    // - [0..63]    `balance`
    // - [64..127]  `numberMinted`
    // - [128..191] `numberBurned`
    // - [192..255] `aux`
    mapping(address => uint256) _packedAddressData;
    // Mapping from token ID to approved address.
    mapping(uint256 => IERC721ABase.TokenApprovalRef) _tokenApprovals;
    // Mapping from owner to operator approvals
    mapping(address => mapping(address => bool)) _operatorApprovals;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}
