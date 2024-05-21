// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ITokenOwnableBase} from "./ITokenOwnable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

// libraries
import {TokenOwnableStorage} from "./TokenOwnableStorage.sol";

// contracts

abstract contract TokenOwnableBase is ITokenOwnableBase {
  function __TokenOwnableBase_init(TokenOwnable memory tokenOwnable) internal {
    TokenOwnableStorage.Layout storage ds = TokenOwnableStorage.layout();
    ds.collection = tokenOwnable.collection;
    ds.tokenId = tokenOwnable.tokenId;
  }

  modifier onlyOwner() {
    if (msg.sender != _owner()) {
      revert Ownable__NotOwner(msg.sender);
    }
    _;
  }

  function _owner() internal view returns (address owner) {
    TokenOwnableStorage.Layout memory ds = TokenOwnableStorage.layout();
    return IERC721(ds.collection).ownerOf(ds.tokenId);
  }

  function _transferOwnership(address newOwner) internal {
    address oldOwner = _owner();
    if (newOwner == address(0)) revert Ownable__ZeroAddress();

    TokenOwnableStorage.Layout memory ds = TokenOwnableStorage.layout();

    IERC721(ds.collection).safeTransferFrom(_owner(), newOwner, ds.tokenId);
    emit OwnershipTransferred(oldOwner, newOwner);
  }
}
