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
        _selectors = new bytes4[](4);
        _selectors[0] = CreateSpaceFacet.createSpace.selector;
        _selectors[1] = bytes4(
            keccak256(
                "createSpaceWithPrepay(((string,string,string,string),((string,string,uint256,uint256,uint64,address,address,uint256,address),(bool,address[],bytes,bool),string[]),(string),(uint256)))"
            )
        );
        _selectors[2] = bytes4(
            keccak256(
                "createSpaceWithPrepay(((string,string,string,string),((string,string,uint256,uint256,uint64,address,address,uint256,address),(bool,address[],bytes),string[]),(string),(uint256)))"
            )
        );
        _selectors[3] = CreateSpaceFacet.createSpaceV2.selector;
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
