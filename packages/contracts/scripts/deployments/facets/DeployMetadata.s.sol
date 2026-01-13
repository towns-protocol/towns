// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {MetadataFacet} from "src/diamond/facets/metadata/MetadataFacet.sol";

library DeployMetadata {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](4);
        res[0] = MetadataFacet.contractType.selector;
        res[1] = MetadataFacet.contractVersion.selector;
        res[2] = MetadataFacet.contractURI.selector;
        res[3] = MetadataFacet.setContractURI.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function makeInitData(
        bytes32 contractType,
        string memory contractURI
    ) internal pure returns (bytes memory) {
        return abi.encodeCall(MetadataFacet.__MetadataFacet_init, (contractType, contractURI));
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("MetadataFacet.sol", "");
    }
}
