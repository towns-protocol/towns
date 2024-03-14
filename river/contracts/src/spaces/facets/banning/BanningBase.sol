// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IBanningBase} from "./IBanning.sol";

// libraries
import {BanningStorage} from "./BanningStorage.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

abstract contract BanningBase is IBanningBase {
  using EnumerableSet for EnumerableSet.UintSet;

  function _ban(uint256 tokenId) internal {
    BanningStorage.Layout storage ds = BanningStorage.layout();
    ds.bannedFromSpace[tokenId] = true;
    ds.bannedIds.add(tokenId);
    emit Banned(tokenId);
  }

  function _isBanned(uint256 tokenId) internal view returns (bool) {
    return BanningStorage.layout().bannedFromSpace[tokenId];
  }

  function _unban(uint256 tokenId) internal {
    BanningStorage.Layout storage ds = BanningStorage.layout();
    ds.bannedFromSpace[tokenId] = false;
    ds.bannedIds.remove(tokenId);
    emit Unbanned(tokenId);
  }

  function _bannedTokenIds() internal view returns (uint256[] memory) {
    return BanningStorage.layout().bannedIds.values();
  }
}
