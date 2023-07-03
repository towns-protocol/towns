// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries
import {TokenOwnableStorage} from "./TokenOwnableStorage.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

// contracts

error TokenOwnable__ZeroAddress();
error TokenOwnable__NotOwner(address account);

library TokenOwnableService {
  function initialize(address collection, uint256 tokenId) internal {
    TokenOwnableStorage.Layout storage ds = TokenOwnableStorage.layout();
    ds.collection = collection;
    ds.tokenId = tokenId;
  }

  function owner() internal view returns (address) {
    TokenOwnableStorage.Layout memory ds = TokenOwnableStorage.layout();
    return IERC721(ds.collection).ownerOf(ds.tokenId);
  }

  function checkOwner() internal view {
    if (msg.sender != owner()) {
      revert TokenOwnable__NotOwner(msg.sender);
    }
  }

  function transferOwnership(address newOwner) internal {
    if (newOwner == address(0)) revert TokenOwnable__ZeroAddress();

    TokenOwnableStorage.Layout memory ds = TokenOwnableStorage.layout();

    IERC721(ds.collection).transferFrom(owner(), newOwner, ds.tokenId);
  }
}
