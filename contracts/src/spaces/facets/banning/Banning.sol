// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries
import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";

// contracts
import {Entitled} from "contracts/src/spaces/facets/Entitled.sol";
import {ERC721ABase} from "contracts/src/diamond/facets/token/ERC721A/ERC721ABase.sol";
import {BanningBase} from "./BanningBase.sol";
import {ChannelService} from "contracts/src/spaces/facets/channels/ChannelService.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract Banning is BanningBase, ERC721ABase, Entitled, Facet {
  function ban(string memory channelId, uint256 tokenId) external {
    if (!_exists(tokenId)) revert Banning__InvalidTokenId(tokenId);
    _validatePermission(Permissions.ModifyBanning);

    if (bytes(channelId).length == 0) {
      _ban(tokenId);
    } else {
      ChannelService.checkChannelExists(channelId);
      _banByChannel(channelId, tokenId);
    }
  }

  function unban(string memory channelId, uint256 tokenId) external {
    if (!_exists(tokenId)) revert Banning__InvalidTokenId(tokenId);

    _validatePermission(Permissions.ModifyBanning);

    if (bytes(channelId).length == 0) {
      _unban(tokenId);
    } else {
      ChannelService.checkChannelExists(channelId);
      _unbanByChannel(channelId, tokenId);
    }
  }

  function isBanned(
    string memory channelId,
    uint256 tokenId
  ) external view returns (bool) {
    if (!_exists(tokenId)) return true;
    if (bytes(channelId).length == 0) return _isBanned(tokenId);
    else return _isBannedByChannel(channelId, tokenId);
  }
}
