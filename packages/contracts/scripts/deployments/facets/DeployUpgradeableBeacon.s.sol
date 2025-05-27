// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {UpgradeableBeaconFacet} from "src/diamond/facets/beacon/UpgradeableBeaconFacet.sol";

library DeployUpgradeableBeacon {
    function selectors() internal pure returns (bytes4[] memory _selectors) {
        _selectors = new bytes4[](2);
        _selectors[0] = UpgradeableBeaconFacet.upgradeTo.selector;
        _selectors[1] = UpgradeableBeaconFacet.implementation.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function makeInitData(address implementation) internal pure returns (bytes memory) {
        return abi.encodeCall(UpgradeableBeaconFacet.__UpgradeableBeacon_init, implementation);
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("UpgradeableBeaconFacet.sol", "");
    }
}
