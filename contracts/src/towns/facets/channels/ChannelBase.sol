// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IChannelBase} from "./IChannel.sol";

// libraries

// services
import {ChannelService} from "./ChannelService.sol";
import {Validator} from "contracts/src/utils/Validator.sol";

abstract contract ChannelBase is IChannelBase {
  function _createChannel(
    string memory channelId,
    string memory metadata,
    uint256[] memory roleIds
  ) internal {
    Validator.checkLength(metadata, 0);
    Validator.checkLength(channelId, 2);
    ChannelService.createChannel(channelId, metadata, roleIds);
    emit ChannelCreated(msg.sender, channelId);
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
    Validator.checkLength(channelId, 2);
    ChannelService.updateChannel(channelId, metadata, disabled);
    emit ChannelUpdated(msg.sender, channelId);
  }

  function _removeChannel(string memory channelId) internal {
    ChannelService.removeChannel(channelId);
    emit ChannelRemoved(msg.sender, channelId);
  }

  function _getRolesByChannel(
    string memory channelId
  ) internal view returns (uint256[] memory) {
    return ChannelService.getRolesByChannel(channelId);
  }

  function _addRoleToChannel(
    string calldata channelId,
    uint256 roleId
  ) internal {
    ChannelService.addRoleToChannel(channelId, roleId);
    emit ChannelRoleAdded(msg.sender, channelId, roleId);
  }

  function _removeRoleFromChannel(
    string calldata channelId,
    uint256 roleId
  ) internal {
    ChannelService.removeRoleFromChannel(channelId, roleId);
    emit ChannelRoleRemoved(msg.sender, channelId, roleId);
  }
}
