// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {IMembershipMetadata} from "src/spaces/facets/membership/metadata/IMembershipMetadata.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts

library DeployMembershipMetadata {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](2);
        res[0] = IMembershipMetadata.refreshMetadata.selector;
        res[1] = IMembershipMetadata.tokenURI.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("MembershipMetadata.sol", "");
    }
}
