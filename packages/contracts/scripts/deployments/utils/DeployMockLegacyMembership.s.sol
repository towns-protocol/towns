// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {MockLegacyMembership} from "test/mocks/legacy/membership/MockLegacyMembership.sol";

library DeployMockLegacyMembership {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](1);
        res[0] = MockLegacyMembership.joinSpaceLegacy.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("MockLegacyMembership.sol", "");
    }
}
