// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IChannelStructs} from "./IChannel.sol";

// libraries
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";

// services
import {EntitlementsService} from "contracts/src/towns/facets/entitlements/EntitlementsService.sol";
import {ChannelService} from "./ChannelService.sol";

import {Validator} from "contracts/src/utils/Validator.sol";

abstract contract ChannelController is IChannelStructs {
  function _createChannel(
    string memory channelId,
    string memory metadata,
    uint256[] memory roleIds
  ) internal {
    EntitlementsService.validatePermission(Permissions.AddRemoveChannels);

    Validator.checkLength(metadata, 0);
    Validator.checkLength(channelId, 2);
    ChannelService.createChannel(channelId, metadata, roleIds);
  }

  function _getChannel(
    string memory channelId
  ) internal view returns (Channel memory channel) {
    (, string memory metadata, bool disabled) = ChannelService.getChannel(
      channelId
    );

    uint256[] memory roleIds = ChannelService.getRolesByChannel(channelId);

    return
      Channel({
        id: channelId,
        disabled: disabled,
        metadata: metadata,
        roleIds: roleIds
      });
  }

  function _getChannels() internal view returns (Channel[] memory) {
    string[] memory channelIds = ChannelService.getChannelIds();

    Channel[] memory channels = new Channel[](channelIds.length);

    for (uint256 i = 0; i < channelIds.length; i++) {
      (string memory id, string memory metadata, bool disabled) = ChannelService
        .getChannel(channelIds[i]);

      uint256[] memory roleIds = ChannelService.getRolesByChannel(
        channelIds[i]
      );

      channels[i] = Channel({
        id: id,
        disabled: disabled,
        metadata: metadata,
        roleIds: roleIds
      });
    }

    return channels;
  }

  function _updateChannel(
    string memory channelId,
    string memory metadata,
    bool disabled
  ) internal {
    EntitlementsService.validatePermission(Permissions.AddRemoveChannels);

    Validator.checkLength(channelId, 2);
    ChannelService.updateChannel(channelId, metadata, disabled);
  }

  function _removeChannel(string memory id) internal {
    EntitlementsService.validatePermission(Permissions.AddRemoveChannels);
    ChannelService.removeChannel(id);
  }

  function _addRoleToChannel(
    string calldata channelId,
    uint256 roleId
  ) internal {
    EntitlementsService.validateChannelPermission(
      channelId,
      Permissions.AddRemoveChannels
    );

    ChannelService.addRoleToChannel(channelId, roleId);
  }

  function _removeRoleFromChannel(
    string calldata channelId,
    uint256 roleId
  ) internal {
    EntitlementsService.validateChannelPermission(
      channelId,
      Permissions.AddRemoveChannels
    );

    ChannelService.removeRoleFromChannel(channelId, roleId);
  }
}
