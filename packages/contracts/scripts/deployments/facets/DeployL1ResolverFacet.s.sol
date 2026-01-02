// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

// contracts
import {L1ResolverFacet} from "src/domains/facets/l1/L1ResolverFacet.sol";

library DeployL1ResolverFacet {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(8);

        // IExtendedResolver
        arr.p(L1ResolverFacet.resolve.selector);

        // CCIP-Read callback
        arr.p(L1ResolverFacet.resolveWithProof.selector);

        // Registry management
        arr.p(L1ResolverFacet.setL2Registry.selector);
        arr.p(L1ResolverFacet.getL2Registry.selector);

        // Gateway URL configuration
        arr.p(L1ResolverFacet.setGatewayURL.selector);
        arr.p(L1ResolverFacet.getGatewayURL.selector);

        // Gateway signer configuration
        arr.p(L1ResolverFacet.setGatewaySigner.selector);
        arr.p(L1ResolverFacet.getGatewaySigner.selector);

        bytes32[] memory selectors_ = arr.asBytes32Array();
        assembly ("memory-safe") {
            res := selectors_
        }
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function makeInitData(
        string memory gatewayUrl,
        address gatewaySigner
    ) internal pure returns (bytes memory) {
        return abi.encodeCall(L1ResolverFacet.__L1Resolver_init, (gatewayUrl, gatewaySigner));
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("L1ResolverFacet.sol", "");
    }
}
