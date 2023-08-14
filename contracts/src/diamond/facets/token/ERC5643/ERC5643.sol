// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IERC5643} from "./IERC5643.sol";

// libraries

// contracts
import {ERC721A} from "contracts/src/diamond/facets/token/ERC721A/ERC721A.sol";
import {ERC5643Base} from "contracts/src/diamond/facets/token/ERC5643/ERC5643Base.sol";

contract ERC5643 is IERC5643, ERC5643Base, ERC721A {
  function __ERC5643_init(
    string memory name_,
    string memory symbol_
  ) internal onlyInitializing {
    __ERC721A_init(name_, symbol_);
    _addInterface(type(IERC5643).interfaceId);
  }

  function renewSubscription(
    uint256 tokenId,
    uint64 duration
  ) external payable {
    if (!_isApprovedOrOwner(tokenId)) revert ERC5643__NotApprovedOrOwner();
    _renewSubscription(tokenId, duration);
  }

  function cancelSubscription(uint256 tokenId) external payable {
    if (!_isApprovedOrOwner(tokenId)) revert ERC5643__NotApprovedOrOwner();
    _cancelSubscription(tokenId);
  }

  function expiresAt(uint256 tokenId) external view returns (uint64) {
    return _expiresAt(tokenId);
  }

  function isRenewable(uint256 tokenId) external view returns (bool) {
    return _isRenewable(tokenId);
  }

  // =============================================================
  //                           Internal
  // =============================================================

  function _isApprovedOrOwner(uint256 tokenId) internal view returns (bool) {
    address owner = ownerOf(tokenId);

    return
      (_msgSenderERC721A() == owner) ||
      isApprovedForAll(owner, _msgSenderERC721A()) ||
      getApproved(tokenId) == _msgSenderERC721A();
  }
}
