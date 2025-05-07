// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {IChannel} from "src/spaces/facets/channels/IChannel.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

library DeployChannels {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](9);
        res[0] = IChannel.createChannel.selector;
        res[1] = IChannel.getChannel.selector;
        res[2] = IChannel.getChannels.selector;
        res[3] = IChannel.updateChannel.selector;
        res[4] = IChannel.removeChannel.selector;
        res[5] = IChannel.addRoleToChannel.selector;
        res[6] = IChannel.getRolesByChannel.selector;
        res[7] = IChannel.removeRoleFromChannel.selector;
        res[8] = IChannel.createChannelWithOverridePermissions.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("Channels.sol", "");
    }
}
