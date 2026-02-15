// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {NodeRegistry} from "src/river/registry/facets/node/NodeRegistry.sol";

library DeployNodeRegistry {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](13);
        res[0] = NodeRegistry.isNode.selector;
        res[1] = NodeRegistry.registerNode.selector;
        res[2] = NodeRegistry.removeNode.selector;
        res[3] = NodeRegistry.updateNodeStatus.selector;
        res[4] = NodeRegistry.updateNodesStatusConfigManager.selector;
        res[5] = NodeRegistry.updateNodeUrl.selector;
        res[6] = NodeRegistry.getNode.selector;
        res[7] = NodeRegistry.getNodeCount.selector;
        res[8] = NodeRegistry.getAllNodeAddresses.selector;
        res[9] = NodeRegistry.getAllNodes.selector;
        res[10] = NodeRegistry.backfillPermanentIndices.selector;
        res[11] = NodeRegistry.setNodeCometBftPubKey.selector;
        res[12] = NodeRegistry.getLastNodeIndex.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("NodeRegistry.sol", "");
    }
}
