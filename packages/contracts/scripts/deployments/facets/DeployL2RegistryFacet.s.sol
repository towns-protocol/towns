// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

// contracts
import {L2RegistryFacet} from "src/domains/facets/l2/L2RegistryFacet.sol";

library DeployL2RegistryFacet {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(24);

        // Registry functions
        arr.p(L2RegistryFacet.createSubdomain.selector);
        arr.p(L2RegistryFacet.addRegistrar.selector);
        arr.p(L2RegistryFacet.removeRegistrar.selector);
        arr.p(L2RegistryFacet.setMetadata.selector);
        arr.p(L2RegistryFacet.getMetadata.selector);
        arr.p(L2RegistryFacet.domainOwner.selector);
        arr.p(L2RegistryFacet.subdomainOwner.selector);
        arr.p(L2RegistryFacet.baseDomainHash.selector);
        arr.p(L2RegistryFacet.namehash.selector);
        arr.p(L2RegistryFacet.decodeName.selector);
        arr.p(L2RegistryFacet.encodeSubdomain.selector);

        // ERC721 functions
        arr.p(L2RegistryFacet.totalSupply.selector);
        arr.p(L2RegistryFacet.balanceOf.selector);
        arr.p(L2RegistryFacet.ownerOf.selector);
        arr.p(L2RegistryFacet.transferFrom.selector);
        arr.p(bytes4(keccak256("safeTransferFrom(address,address,uint256)")));
        arr.p(bytes4(keccak256("safeTransferFrom(address,address,uint256,bytes)")));
        arr.p(L2RegistryFacet.approve.selector);
        arr.p(L2RegistryFacet.setApprovalForAll.selector);
        arr.p(L2RegistryFacet.getApproved.selector);
        arr.p(L2RegistryFacet.isApprovedForAll.selector);
        arr.p(L2RegistryFacet.name.selector);
        arr.p(L2RegistryFacet.symbol.selector);
        arr.p(L2RegistryFacet.tokenURI.selector);

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
        string memory domain,
        address admin
    ) internal pure returns (bytes memory) {
        return abi.encodeCall(L2RegistryFacet.__L2RegistryFacet_init, (domain, admin));
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("L2RegistryFacet.sol", "");
    }
}

