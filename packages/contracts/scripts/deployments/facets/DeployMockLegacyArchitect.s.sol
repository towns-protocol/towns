// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {MockLegacyArchitect} from "test/mocks/legacy/MockLegacyArchitect.sol";

library DeployMockLegacyArchitect {
    function selectors() internal pure returns (bytes4[] memory _selectors) {
        _selectors = new bytes4[](1);
        _selectors[0] = MockLegacyArchitect.createSpace.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function makeInitData() internal pure returns (bytes memory) {
        return abi.encodeCall(MockLegacyArchitect.__Architect_init, ());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("MockLegacyArchitect.sol", "");
    }
}
