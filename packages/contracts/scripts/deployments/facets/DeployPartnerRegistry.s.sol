// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";
import {PartnerRegistry} from "src/factory/facets/partner/PartnerRegistry.sol";

contract DeployPartnerRegistry is FacetHelper, Deployer {
    constructor() {
        addSelector(PartnerRegistry.registerPartner.selector);
        addSelector(PartnerRegistry.partnerInfo.selector);
        addSelector(PartnerRegistry.partnerFee.selector);
        addSelector(PartnerRegistry.updatePartner.selector);
        addSelector(PartnerRegistry.removePartner.selector);
        addSelector(PartnerRegistry.maxPartnerFee.selector);
        addSelector(PartnerRegistry.setMaxPartnerFee.selector);
        addSelector(PartnerRegistry.registryFee.selector);
        addSelector(PartnerRegistry.setRegistryFee.selector);
    }

    function initializer() public pure override returns (bytes4) {
        return PartnerRegistry.__PartnerRegistry_init.selector;
    }

    function versionName() public pure override returns (string memory) {
        return "facets/partnerRegistryFacet";
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.startBroadcast(deployer);
        PartnerRegistry partnerRegistry = new PartnerRegistry();
        vm.stopBroadcast();
        return address(partnerRegistry);
    }
}
