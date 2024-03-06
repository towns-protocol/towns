// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IBanningBase} from "./IBanning.sol";

// libraries
import {BanningStorage} from "./BanningStorage.sol";

// contracts

abstract contract BanningBase is IBanningBase {
  function _ban(uint256 tokenId) internal {
    BanningStorage.layout().banned[tokenId] = true;
  }

  function _banByChannel(string memory channelId, uint256 tokenId) internal {
    BanningStorage.layout().bannedByChannel[channelId][tokenId] = true;
  }

  function _unban(uint256 tokenId) internal {
    BanningStorage.layout().banned[tokenId] = false;
  }

  function _unbanByChannel(string memory channelId, uint256 tokenId) internal {
    BanningStorage.layout().bannedByChannel[channelId][tokenId] = false;
  }

  function _isBanned(uint256 tokenId) internal view returns (bool) {
    return BanningStorage.layout().banned[tokenId];
  }

  function _isBannedByChannel(
    string memory channelId,
    uint256 tokenId
  ) internal view returns (bool) {
    return BanningStorage.layout().bannedByChannel[channelId][tokenId];
  }
}
