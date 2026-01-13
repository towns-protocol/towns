// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {FeatureManagerFacet} from "src/factory/facets/feature/FeatureManagerFacet.sol";

library DeployFeatureManager {
    function selectors() internal pure returns (bytes4[] memory _selectors) {
        _selectors = new bytes4[](7);
        _selectors[0] = FeatureManagerFacet.setFeatureCondition.selector;
        _selectors[1] = FeatureManagerFacet.updateFeatureCondition.selector;
        _selectors[2] = FeatureManagerFacet.getFeatureCondition.selector;
        _selectors[3] = FeatureManagerFacet.getFeatureConditions.selector;
        _selectors[4] = FeatureManagerFacet.getFeatureConditionsForSpace.selector;
        _selectors[5] = FeatureManagerFacet.checkFeatureCondition.selector;
        _selectors[6] = FeatureManagerFacet.disableFeatureCondition.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function makeInitData() internal pure returns (bytes memory) {
        return abi.encodeCall(FeatureManagerFacet.__FeatureManagerFacet_init, ());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("FeatureManagerFacet.sol", "");
    }
}
