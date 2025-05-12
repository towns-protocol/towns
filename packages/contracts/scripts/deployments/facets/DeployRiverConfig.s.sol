// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {RiverConfig} from "src/river/registry/facets/config/RiverConfig.sol";

library DeployRiverConfig {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](9);
        res[0] = RiverConfig.configurationExists.selector;
        res[1] = RiverConfig.setConfiguration.selector;
        res[2] = RiverConfig.deleteConfiguration.selector;
        res[3] = RiverConfig.deleteConfigurationOnBlock.selector;
        res[4] = RiverConfig.getConfiguration.selector;
        res[5] = RiverConfig.getAllConfiguration.selector;
        res[6] = RiverConfig.isConfigurationManager.selector;
        res[7] = RiverConfig.approveConfigurationManager.selector;
        res[8] = RiverConfig.removeConfigurationManager.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function makeInitData(address[] memory configManagers) internal pure returns (bytes memory) {
        return abi.encodeCall(RiverConfig.__RiverConfig_init, (configManagers));
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("RiverConfig.sol", "");
    }
}
