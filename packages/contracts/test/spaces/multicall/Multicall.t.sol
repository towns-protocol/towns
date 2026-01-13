// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// utils

// interfaces
import {IChannel, IChannelBase} from "src/spaces/facets/channels/IChannel.sol";

// libraries
import {IChannelBase} from "src/spaces/facets/channels/IChannel.sol";

// contracts

import {BaseSetup} from "../BaseSetup.sol";
import {Multicallable} from "solady/utils/Multicallable.sol";

contract MulticallTest is BaseSetup {
    function test_multicall() external {
        bytes32 channelId = "my-cool-channel";
        string memory channelMetadata = "Metadata";

        bytes[] memory data = new bytes[](3);
        data[0] = abi.encodeCall(
            IChannel.createChannel,
            (channelId, channelMetadata, new uint256[](0))
        );
        data[1] = abi.encodeCall(IChannel.getChannel, (channelId));
        data[2] = abi.encodeCall(IChannel.removeChannel, (channelId));

        vm.prank(founder);
        bytes[] memory results = Multicallable(everyoneSpace).multicall(data);

        assertEq(results.length, 3);
        assertEq(results[0].length, 0);
        IChannelBase.Channel memory channel = abi.decode(results[1], (IChannelBase.Channel));
        assertEq(channel.id, channelId);
        assertEq(channel.disabled, false);
        assertEq(channel.metadata, channelMetadata);
        assertEq(channel.roleIds, new uint256[](0));
        assertEq(results[2].length, 0);
    }

    function test_multicall_revertWithData() external {
        bytes32 channelId = "my-cool-channel";

        bytes[] memory data = new bytes[](1);
        data[0] = abi.encodeCall(IChannel.getChannel, (channelId));

        vm.expectRevert(IChannelBase.ChannelService__ChannelDoesNotExist.selector);
        Multicallable(everyoneSpace).multicall(data);
    }
}
