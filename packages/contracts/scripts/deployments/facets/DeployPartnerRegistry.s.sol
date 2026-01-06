// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {PartnerRegistry} from "src/factory/facets/partner/PartnerRegistry.sol";

library DeployPartnerRegistry {
    function selectors() internal pure returns (bytes4[] memory _selectors) {
        _selectors = new bytes4[](9);
        _selectors[0] = PartnerRegistry.registerPartner.selector;
        _selectors[1] = PartnerRegistry.partnerInfo.selector;
        _selectors[2] = PartnerRegistry.partnerFee.selector;
        _selectors[3] = PartnerRegistry.updatePartner.selector;
        _selectors[4] = PartnerRegistry.removePartner.selector;
        _selectors[5] = PartnerRegistry.maxPartnerFee.selector;
        _selectors[6] = PartnerRegistry.setMaxPartnerFee.selector;
        _selectors[7] = PartnerRegistry.registryFee.selector;
        _selectors[8] = PartnerRegistry.setRegistryFee.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function makeInitData() internal pure returns (bytes memory) {
        return abi.encodeCall(PartnerRegistry.__PartnerRegistry_init, ());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("PartnerRegistry.sol", "");
    }
}
