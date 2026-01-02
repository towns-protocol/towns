// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {AddrResolverFacet} from "src/domains/facets/l2/AddrResolverFacet.sol";

library DeployAddrResolverFacet {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](4);
        res[0] = bytes4(keccak256("setAddr(bytes32,uint256,bytes)"));
        res[1] = bytes4(keccak256("setAddr(bytes32,address)"));
        res[2] = bytes4(keccak256("addr(bytes32,uint256)"));
        res[3] = bytes4(keccak256("addr(bytes32)"));
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function makeInitData() internal pure returns (bytes memory) {
        return abi.encodeCall(AddrResolverFacet.__AddrResolverFacet_init, ());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("AddrResolverFacet.sol", "");
    }
}
