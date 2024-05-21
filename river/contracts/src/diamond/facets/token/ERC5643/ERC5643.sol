// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC5643} from "./IERC5643.sol";

// libraries

// contracts
import {ERC721ABase} from "contracts/src/diamond/facets/token/ERC721A/ERC721ABase.sol";
import {ERC5643Base} from "contracts/src/diamond/facets/token/ERC5643/ERC5643Base.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract ERC5643 is IERC5643, ERC5643Base, ERC721ABase, Facet {
  function __ERC5643_init() external onlyInitializing {
    _addInterface(type(IERC5643).interfaceId);
  }

  function renewSubscription(
    uint256 tokenId,
    uint64 duration
  ) external payable virtual {
    if (duration == 0) revert ERC5643__DurationZero();
    if (!_isApprovedOrOwner(tokenId)) revert ERC5643__NotApprovedOrOwner();
    _renewSubscription(tokenId, duration);
  }

  function cancelSubscription(uint256 tokenId) external payable virtual {
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
    address owner = _ownerOf(tokenId);

    return
      (_msgSenderERC721A() == owner) ||
      _isApprovedForAll(owner, _msgSenderERC721A()) ||
      _getApproved(tokenId) == _msgSenderERC721A();
  }
}
