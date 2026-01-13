// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {CreateSpaceFacet} from "src/factory/facets/create/CreateSpace.sol";

library DeployCreateSpace {
    function selectors() internal pure returns (bytes4[] memory _selectors) {
        _selectors = new bytes4[](6);
        // createSpace(SpaceInfo) - Basic space creation with SpaceInfo struct
        _selectors[0] = 0xf822028d;
        // createSpaceWithPrepay(CreateSpace) - Space creation with prepay (new format)
        _selectors[1] = 0xcd55d94c;
        // createSpaceWithPrepay(CreateSpaceOld) - Space creation with prepay (legacy format)
        _selectors[2] = 0xc07ed896;
        // createSpaceV2(CreateSpace, SpaceOptions) - Space creation with options
        _selectors[3] = CreateSpaceFacet.createSpaceV2.selector;
        // createSpace(Action, bytes) - Unified entry point with action dispatch
        _selectors[4] = bytes4(keccak256("createSpace(uint8,bytes)"));
        _selectors[5] = CreateSpaceFacet.getProxyInitializer.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function makeInitData() internal pure returns (bytes memory) {
        return abi.encodeCall(CreateSpaceFacet.__CreateSpace_init, ());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("CreateSpaceFacet", "");
    }
}
