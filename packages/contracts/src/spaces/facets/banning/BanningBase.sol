// SPDX-License-Identifier: MIT
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
        BanningStorage.layout().bannedIds.add(tokenId);
        emit Banned(msg.sender, tokenId);
    }

    function _unban(uint256 tokenId) internal {
        BanningStorage.layout().bannedIds.remove(tokenId);
        emit Unbanned(msg.sender, tokenId);
    }

    function _isBanned(uint256 tokenId) internal view returns (bool isBanned) {
        return BanningStorage.layout().bannedIds.contains(tokenId);
    }

    function _bannedTokenIds() internal view returns (uint256[] memory) {
        return BanningStorage.layout().bannedIds.values();
    }
}
