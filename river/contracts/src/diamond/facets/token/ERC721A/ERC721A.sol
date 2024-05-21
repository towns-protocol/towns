// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IERC721A} from "./IERC721A.sol";
import {ERC721AStorage} from "./ERC721AStorage.sol";
import {ERC721ABase} from "./ERC721ABase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

/**
 * @title ERC721A
 *
 * @dev Implementation of the [ERC721](https://eips.ethereum.org/EIPS/eip-721)
 * Non-Fungible Token Standard, including the Metadata extension.
 * Optimized for lower gas during batch mints.
 *
 * Token IDs are minted in sequential order (e.g. 0, 1, 2, 3, ...)
 * starting from `_startTokenId()`.
 *
 * Assumptions:
 *
 * - An owner cannot have more than 2**64 - 1 (max value of uint64) of supply.
 * - The maximum token ID cannot exceed 2**256 - 1 (max value of uint256).
 */
contract ERC721A is IERC721A, ERC721ABase, Facet {
  using ERC721AStorage for ERC721AStorage.Layout;

  function __ERC721A_init(
    string memory name_,
    string memory symbol_
  ) external onlyInitializing {
    __ERC721A_init_unchained(name_, symbol_);
  }

  function __ERC721A_init_unchained(
    string memory name_,
    string memory symbol_
  ) internal onlyInitializing {
    _addInterface(0x80ac58cd); // ERC165 Interface ID for ERC721
    _addInterface(0x5b5e139f); // ERC165 Interface ID for ERC721Metadata
    __ERC721ABase_init(name_, symbol_);
  }

  /**
   * @dev Returns the total number of tokens in existence.
   * Burned tokens will reduce the count.
   * To get the total number of tokens minted, please see {_totalMinted}.
   */
  function totalSupply() public view virtual returns (uint256) {
    return _totalSupply();
  }

  /**
   * @dev Returns the number of tokens in `owner`'s account.
   */
  function balanceOf(address owner) public view virtual returns (uint256) {
    return _balanceOf(owner);
  }

  // =============================================================
  //                        IERC721Metadata
  // =============================================================

  /**
   * @dev Returns the token collection name.
   */
  function name() public view virtual override returns (string memory) {
    return ERC721AStorage.layout()._name;
  }

  /**
   * @dev Returns the token collection symbol.
   */
  function symbol() public view virtual override returns (string memory) {
    return ERC721AStorage.layout()._symbol;
  }

  /**
   * @dev Returns the Uniform Resource Identifier (URI) for `tokenId` token.
   */
  function tokenURI(
    uint256 tokenId
  ) public view virtual override returns (string memory) {
    if (!_exists(tokenId)) revert URIQueryForNonexistentToken();

    string memory baseURI = _baseURI();
    return
      bytes(baseURI).length != 0
        ? string(abi.encodePacked(baseURI, _toString(tokenId)))
        : "";
  }

  /**
   * @dev Returns the owner of the `tokenId` token.
   *
   * Requirements:
   *
   * - `tokenId` must exist.
   */
  function ownerOf(
    uint256 tokenId
  ) public view virtual override returns (address) {
    return address(uint160(_packedOwnershipOf(tokenId)));
  }

  /**
   * @dev Gives permission to `to` to transfer `tokenId` token to another account. See {ERC721A-_approve}.
   *
   * Requirements:
   *
   * - The caller must own the token or be an approved operator.
   */
  function approve(
    address to,
    uint256 tokenId
  ) public payable virtual override {
    _approve(to, tokenId, true);
  }

  /**
   * @dev Returns the account approved for `tokenId` token.
   *
   * Requirements:
   *
   * - `tokenId` must exist.
   */
  function getApproved(
    uint256 tokenId
  ) public view virtual override returns (address) {
    return _getApproved(tokenId);
  }

  /**
   * @dev Approve or remove `operator` as an operator for the caller.
   * Operators can call {transferFrom} or {safeTransferFrom}
   * for any token owned by the caller.
   *
   * Requirements:
   *
   * - The `operator` cannot be the caller.
   *
   * Emits an {ApprovalForAll} event.
   */
  function setApprovalForAll(
    address operator,
    bool approved
  ) public virtual override {
    ERC721AStorage.layout()._operatorApprovals[_msgSenderERC721A()][
      operator
    ] = approved;
    emit ApprovalForAll(_msgSenderERC721A(), operator, approved);
  }

  /**
   * @dev Returns if the `operator` is allowed to manage all of the assets of `owner`.
   *
   * See {setApprovalForAll}.
   */
  function isApprovedForAll(
    address owner,
    address operator
  ) public view virtual override returns (bool) {
    return _isApprovedForAll(owner, operator);
  }

  /**
   * @dev Transfers `tokenId` from `from` to `to`.
   *
   * Requirements:
   *
   * - `from` cannot be the zero address.
   * - `to` cannot be the zero address.
   * - `tokenId` token must be owned by `from`.
   * - If the caller is not `from`, it must be approved to move this token
   * by either {approve} or {setApprovalForAll}.
   *
   * Emits a {Transfer} event.
   */
  function transferFrom(
    address from,
    address to,
    uint256 tokenId
  ) public payable virtual override {
    uint256 prevOwnershipPacked = _packedOwnershipOf(tokenId);

    if (address(uint160(prevOwnershipPacked)) != from)
      revert TransferFromIncorrectOwner();

    (
      uint256 approvedAddressSlot,
      address approvedAddress
    ) = _getApprovedSlotAndAddress(tokenId);

    // The nested ifs save around 20+ gas over a compound boolean condition.
    if (!_isSenderApprovedOrOwner(approvedAddress, from, _msgSenderERC721A()))
      if (!isApprovedForAll(from, _msgSenderERC721A()))
        revert TransferCallerNotOwnerNorApproved();

    if (to == address(0)) revert TransferToZeroAddress();

    _beforeTokenTransfers(from, to, tokenId, 1);

    // Clear approvals from the previous owner.
    assembly {
      if approvedAddress {
        // This is equivalent to `delete _tokenApprovals[tokenId]`.
        sstore(approvedAddressSlot, 0)
      }
    }

    // Underflow of the sender's balance is impossible because we check for
    // ownership above and the recipient's balance can't realistically overflow.
    // Counter overflow is incredibly unrealistic as `tokenId` would have to be 2**256.
    unchecked {
      // We can directly increment and decrement the balances.
      --ERC721AStorage.layout()._packedAddressData[from]; // Updates: `balance -= 1`.
      ++ERC721AStorage.layout()._packedAddressData[to]; // Updates: `balance += 1`.

      // Updates:
      // - `address` to the next owner.
      // - `startTimestamp` to the timestamp of transfering.
      // - `burned` to `false`.
      // - `nextInitialized` to `true`.
      ERC721AStorage.layout()._packedOwnerships[tokenId] = _packOwnershipData(
        to,
        _BITMASK_NEXT_INITIALIZED |
          _nextExtraData(from, to, prevOwnershipPacked)
      );

      // If the next slot may not have been initialized (i.e. `nextInitialized == false`) .
      if (prevOwnershipPacked & _BITMASK_NEXT_INITIALIZED == 0) {
        uint256 nextTokenId = tokenId + 1;
        // If the next slot's address is zero and not burned (i.e. packed value is zero).
        if (ERC721AStorage.layout()._packedOwnerships[nextTokenId] == 0) {
          // If the next slot is within bounds.
          if (nextTokenId != ERC721AStorage.layout()._currentIndex) {
            // Initialize the next slot to maintain correctness for `ownerOf(tokenId + 1)`.
            ERC721AStorage.layout()._packedOwnerships[
              nextTokenId
            ] = prevOwnershipPacked;
          }
        }
      }
    }

    emit Transfer(from, to, tokenId);
    _afterTokenTransfers(from, to, tokenId, 1);
  }

  /**
   * @dev Equivalent to `safeTransferFrom(from, to, tokenId, '')`.
   */
  function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId
  ) public payable virtual override {
    safeTransferFrom(from, to, tokenId, "");
  }

  /**
   * @dev Safely transfers `tokenId` token from `from` to `to`.
   *
   * Requirements:
   *
   * - `from` cannot be the zero address.
   * - `to` cannot be the zero address.
   * - `tokenId` token must exist and be owned by `from`.
   * - If the caller is not `from`, it must be approved to move this token
   * by either {approve} or {setApprovalForAll}.
   * - If `to` refers to a smart contract, it must implement
   * {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.
   *
   * Emits a {Transfer} event.
   */
  function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId,
    bytes memory _data
  ) public payable virtual override {
    transferFrom(from, to, tokenId);
    if (to.code.length != 0)
      if (!_checkContractOnERC721Received(from, to, tokenId, _data)) {
        revert TransferToNonERC721ReceiverImplementer();
      }
  }
}
