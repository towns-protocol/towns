// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces
import {IProxyManager} from "contracts/src/diamond/proxy/manager/IProxyManager.sol";
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";

// utils
import {Interaction} from "../common/Interaction.s.sol";

// helpers
import {PricingModulesHelper} from "contracts/test/spaces/architect/pricing/PricingModulesHelper.sol";
import {MembershipHelper} from "contracts/test/spaces/membership/MembershipHelper.sol";
import {ERC721AHelper} from "contracts/test/diamond/erc721a/ERC721ASetup.sol";

// contracts

// deployments
import {DeployPricingModules} from "contracts/scripts/deployments/facets/DeployPricingModules.s.sol";
import {DeployMembership} from "contracts/scripts/deployments/DeployMembership.s.sol";
import {DeployTieredLogPricing} from "contracts/scripts/deployments/DeployTieredLogPricing.s.sol";
import {DeployFixedPricing} from "contracts/scripts/deployments/DeployFixedPricing.s.sol";

contract InteractSpaceFactory is Interaction {
  PricingModulesHelper pricingModulesHelper = new PricingModulesHelper();
  MembershipHelper membershipHelper = new MembershipHelper();
  ERC721AHelper erc721aHelper = new ERC721AHelper();

  DeployPricingModules deployPricingModules = new DeployPricingModules();
  DeployMembership deployMembership = new DeployMembership();
  DeployFixedPricing deployFixedPricing = new DeployFixedPricing();
  DeployTieredLogPricing deployTieredLogPricing = new DeployTieredLogPricing();

  function __interact(uint256 deployerPk, address) public override {
    address spaceFactory = getDeployment("spaceFactory");

    // deploy pricing modules
    address pricingModulesFacet = deployPricingModules.deploy();
    address fixedPricingModule = deployFixedPricing.deploy();
    address tieredLogPricingModule = deployTieredLogPricing.deploy();

    address[] memory pricingModules = new address[](2);
    pricingModules[0] = fixedPricingModule;
    pricingModules[1] = tieredLogPricingModule;

    IDiamond.FacetCut[] memory factoryCuts = new IDiamond.FacetCut[](1);
    factoryCuts[0] = IDiamond.FacetCut({
      facetAddress: pricingModulesFacet,
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: pricingModulesHelper.selectors()
    });

    vm.startBroadcast(deployerPk);
    IDiamondCut(spaceFactory).diamondCut({
      facetCuts: factoryCuts,
      init: pricingModulesFacet,
      initPayload: abi.encodeWithSelector(
        pricingModulesHelper.initializer(),
        pricingModules
      )
    });
    vm.stopBroadcast();

    address space = getDeployment("space");
    address membership = deployMembership.deploy();

    membershipHelper.addSelectors(erc721aHelper.selectors());

    IDiamond.FacetCut[] memory spaceCuts = new IDiamond.FacetCut[](1);
    spaceCuts[0] = IDiamond.FacetCut({
      facetAddress: membership,
      action: IDiamond.FacetCutAction.Replace,
      functionSelectors: membershipHelper.selectors()
    });

    vm.startBroadcast(deployerPk);
    IDiamondCut(space).diamondCut({
      facetCuts: spaceCuts,
      init: address(0),
      initPayload: ""
    });
    vm.stopBroadcast();
  }
}
