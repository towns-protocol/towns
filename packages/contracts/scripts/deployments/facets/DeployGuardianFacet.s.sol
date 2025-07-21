// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {IGuardian} from "src/spaces/facets/guardian/IGuardian.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {GuardianFacet} from "src/spaces/facets/guardian/GuardianFacet.sol";

library DeployGuardianFacet {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](6);
        res[0] = IGuardian.enableGuardian.selector;
        res[1] = IGuardian.guardianCooldown.selector;
        res[2] = IGuardian.disableGuardian.selector;
        res[3] = IGuardian.isGuardianEnabled.selector;
        res[4] = IGuardian.getDefaultCooldown.selector;
        res[5] = IGuardian.setDefaultCooldown.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function makeInitData(uint256 cooldown) internal pure returns (bytes memory) {
        return abi.encodeCall(GuardianFacet.__GuardianFacet_init, cooldown);
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("GuardianFacet.sol", "");
    }
}
