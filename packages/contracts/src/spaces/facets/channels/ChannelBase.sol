// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IChannelBase} from "./IChannel.sol";

// libraries

// services
import {ChannelService} from "./ChannelService.sol";
import {Validator} from "../../../utils/libraries/Validator.sol";

abstract contract ChannelBase is IChannelBase {
    function _createChannel(
        bytes32 channelId,
        string calldata metadata,
        uint256[] memory roleIds
    ) internal {
        Validator.checkLengthCalldata(metadata, 0);
        ChannelService.createChannel(channelId, metadata, roleIds);
        emit ChannelCreated(msg.sender, channelId);
    }

    function _setChannelRoleOverrides(bytes32 channelId, uint256[] memory roleIds) internal {
        for (uint256 i; i < roleIds.length; ++i) {
            _addRoleToChannel(channelId, roleIds[i]);
        }
    }

    function _updateChannel(bytes32 channelId, string calldata metadata, bool disabled) internal {
        ChannelService.updateChannel(channelId, metadata, disabled);
        emit ChannelUpdated(msg.sender, channelId);
    }

    function _removeChannel(bytes32 channelId) internal {
        ChannelService.removeChannel(channelId);
        emit ChannelRemoved(msg.sender, channelId);
    }

    function _addRoleToChannel(bytes32 channelId, uint256 roleId) internal {
        ChannelService.addRoleToChannel(channelId, roleId);
        emit ChannelRoleAdded(msg.sender, channelId, roleId);
    }

    function _removeRoleFromChannel(bytes32 channelId, uint256 roleId) internal {
        ChannelService.removeRoleFromChannel(channelId, roleId);
        emit ChannelRoleRemoved(msg.sender, channelId, roleId);
    }

    function _getChannel(bytes32 channelId) internal view returns (Channel memory channel) {
        (, string memory metadata, bool disabled) = ChannelService.getChannel(channelId);

        uint256[] memory roleIds = ChannelService.getRolesByChannel(channelId);

        (channel.id, channel.disabled, channel.metadata, channel.roleIds) = (
            channelId,
            disabled,
            metadata,
            roleIds
        );
    }

    function _getChannels() internal view returns (Channel[] memory channels) {
        bytes32[] memory channelIds = ChannelService.getChannelIds();

        channels = new Channel[](channelIds.length);

        for (uint256 i; i < channelIds.length; ++i) {
            (bytes32 id, string memory metadata, bool disabled) = ChannelService.getChannel(
                channelIds[i]
            );
            uint256[] memory roleIds = ChannelService.getRolesByChannel(channelIds[i]);

            Channel memory channel = channels[i];
            (channel.id, channel.disabled, channel.metadata, channel.roleIds) = (
                id,
                disabled,
                metadata,
                roleIds
            );
        }
    }

    function _getRolesByChannel(bytes32 channelId) internal view returns (uint256[] memory) {
        return ChannelService.getRolesByChannel(channelId);
    }
}
