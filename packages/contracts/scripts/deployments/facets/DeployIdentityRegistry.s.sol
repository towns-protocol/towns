// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {DeployERC721A} from "../facets/DeployERC721A.s.sol";

// contracts
import {IdentityRegistryFacet} from "src/apps/facets/identity/IdentityRegistryFacet.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

library DeployIdentityRegistry {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        uint256 selectorsCount = 20;
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(selectorsCount);
        arr.p(bytes4(keccak256("register()")));
        arr.p(bytes4(keccak256("register(string)")));
        arr.p(bytes4(keccak256("register(string,(string,bytes)[])")));
        arr.p(IdentityRegistryFacet.getMetadata.selector);
        arr.p(IdentityRegistryFacet.setMetadata.selector);
        arr.p(IdentityRegistryFacet.setAgentUri.selector);

        {
            bytes4[] memory selectors_2 = DeployERC721A.selectors();
            if (selectors_2.length > selectorsCount) {
                revert("Selectors count is greater than the reserved space");
            }
            for (uint256 i; i < selectors_2.length; ++i) {
                arr.p(selectors_2[i]);
            }
        }

        bytes32[] memory selectors_ = arr.asBytes32Array();

        assembly ("memory-safe") {
            res := selectors_
        }
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return
            IDiamond.FacetCut({
                action: action,
                facetAddress: facetAddress,
                functionSelectors: selectors()
            });
    }

    function makeInitData() internal pure returns (bytes memory) {
        return abi.encodeCall(IdentityRegistryFacet.__IdentityRegistryFacet_init, ());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("IdentityRegistryFacet.sol", "");
    }
}
