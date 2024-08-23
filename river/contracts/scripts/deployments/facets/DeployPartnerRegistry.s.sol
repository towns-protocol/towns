// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

import {PartnerRegistry} from "contracts/src/factory/facets/partner/PartnerRegistry.sol";

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
    return "partnerRegistryFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    PartnerRegistry partnerRegistry = new PartnerRegistry();
    vm.stopBroadcast();
    return address(partnerRegistry);
  }
}
