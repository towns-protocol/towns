// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {SpaceFactoryInit} from "src/factory/SpaceFactoryInit.sol";

library DeploySpaceFactoryInit {
    function selectors() internal pure returns (bytes4[] memory _selectors) {
        _selectors = new bytes4[](1);
        _selectors[0] = SpaceFactoryInit.initialize.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function makeInitData(address _proxyInitializer) internal pure returns (bytes memory) {
        return abi.encodeCall(SpaceFactoryInit.initialize, (_proxyInitializer));
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("SpaceFactoryInit.sol", "");
    }
}
