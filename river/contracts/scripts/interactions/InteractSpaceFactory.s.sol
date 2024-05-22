// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IArchitect} from "contracts/src/factory/facets/architect/IArchitect.sol";
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";
import {IRuleEntitlement} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";
import {IUserEntitlement} from "contracts/src/spaces/entitlements/user/IUserEntitlement.sol";
import {ISpaceOwner} from "contracts/src/spaces/facets/owner/ISpaceOwner.sol";

//libraries

//contracts
import {Interaction} from "../common/Interaction.s.sol";
import {ProxyManager} from "contracts/src/diamond/proxy/manager/ProxyManager.sol";
import {DeployArchitect} from "contracts/scripts/deployments/facets/DeployArchitect.s.sol";
import {DeploySpace} from "contracts/scripts/deployments/DeploySpace.s.sol";
import {DeployRuleEntitlement} from "contracts/scripts/deployments/DeployRuleEntitlement.s.sol";
import {Architect} from "contracts/src/factory/facets/architect/Architect.sol";

// debuggging

contract InteractSpaceFactory is Interaction {
  // Deployments
  DeployArchitect architectHelper = new DeployArchitect();
  DeploySpace spaceHelper = new DeploySpace();
  DeployRuleEntitlement ruleEntitlementHelper = new DeployRuleEntitlement();

  IDiamond.FacetCut[] cuts;

  function __interact(address deployer) public override {
    address spaceFactory = getDeployment("spaceFactory");

    // deploy rule entitlement
    address ruleEntitlement = ruleEntitlementHelper.deploy();
    address space = spaceHelper.deploy();
    address architect = architectHelper.deploy();

    vm.startBroadcast(deployer);
    IArchitect(spaceFactory).setSpaceArchitectImplementations(
      ISpaceOwner(getDeployment("spaceOwner")),
      IUserEntitlement(getDeployment("userEntitlement")),
      IRuleEntitlement(ruleEntitlement)
    );
    vm.stopBroadcast();

    cuts.push(
      architectHelper.makeCut(architect, IDiamond.FacetCutAction.Replace)
    );

    // upgrade architect facet
    vm.startBroadcast(deployer);
    IDiamondCut(spaceFactory).diamondCut({
      facetCuts: cuts,
      init: address(0),
      initPayload: ""
    });
    ProxyManager(spaceFactory).setImplementation(space);
    vm.stopBroadcast();
  }
}
