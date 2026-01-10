// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IERC721ABase} from "./IERC721A.sol";

library ERC721AStorage {
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

    // keccak256(abi.encode(uint256(keccak256("diamond.facets.token.ERC721A.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x6569bde4a160c636ea8b8d11acb83a60d7fec0b8f2e09389306cba0e1340df00;

    // Mask of an entry in packed address data.
    uint256 internal constant _BITMASK_ADDRESS_DATA_ENTRY = (1 << 64) - 1;

    // The bit mask of the `burned` bit in packed ownership.
    uint256 internal constant _BITMASK_BURNED = 1 << 224;

    /**
     * Returns the packed ownership data of `tokenId`.
     */
    function packedOwnershipOf(
        uint256 startTokenId,
        uint256 tokenId
    ) internal view returns (uint256 packed) {
        if (startTokenId <= tokenId) {
            Layout storage $ = layout();

            packed = $._packedOwnerships[tokenId];
            // If not burned.
            if (packed & _BITMASK_BURNED == 0) {
                // If the data at the starting slot does not exist, start the scan.
                if (packed == 0) {
                    if (tokenId >= $._currentIndex) {
                        revert IERC721ABase.OwnerQueryForNonexistentToken();
                    }
                    // Invariant:
                    // There will always be an initialized ownership slot
                    // (i.e. `ownership.addr != address(0) && ownership.burned == false`)
                    // before an unintialized ownership slot
                    // (i.e. `ownership.addr == address(0) && ownership.burned == false`)
                    // Hence, `tokenId` will not underflow.
                    //
                    // We can directly compare the packed value.
                    // If the address is zero, packed will be zero.
                    for (;;) {
                        unchecked {
                            packed = $._packedOwnerships[--tokenId];
                        }
                        if (packed == 0) continue;
                        return packed;
                    }
                }
                // Otherwise, the data exists and is not burned. We can skip the scan.
                // This is possible because we have already achieved the target condition.
                // This saves 2143 gas on transfers of initialized tokens.
                return packed;
            }
        }
        revert IERC721ABase.OwnerQueryForNonexistentToken();
    }

    function balanceOf(address owner) internal view returns (uint256) {
        if (owner == address(0)) revert IERC721ABase.BalanceQueryForZeroAddress();
        return layout()._packedAddressData[owner] & _BITMASK_ADDRESS_DATA_ENTRY;
    }

    function ownerAt(uint256 startTokenId, uint256 tokenId) internal view returns (address) {
        return address(uint160(packedOwnershipOf(startTokenId, tokenId)));
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}
