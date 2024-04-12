// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces
import {IArchitect} from "contracts/src/factory/facets/architect/IArchitect.sol";
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";
import {IRuleEntitlement} from "contracts/src/crosschain/IRuleEntitlement.sol";
import {IWalletLink} from "contracts/src/river/wallet-link/IWalletLink.sol";
import {IUserEntitlement} from "contracts/src/spaces/entitlements/user/IUserEntitlement.sol";
import {ISpaceOwner} from "contracts/src/spaces/facets/owner/ISpaceOwner.sol";
import {IEntitlementChecker} from "contracts/src/crosschain/checker/IEntitlementChecker.sol";

//libraries

//contracts
import {Interaction} from "../common/Interaction.s.sol";
import {ProxyManager} from "contracts/src/diamond/proxy/manager/ProxyManager.sol";
import {DeployArchitect} from "contracts/scripts/deployments/facets/DeployArchitect.s.sol";
import {DeploySpace} from "contracts/scripts/deployments/DeploySpace.s.sol";
import {Architect} from "contracts/src/factory/facets/architect/Architect.sol";
import {DeployWalletLink} from "./../deployments/DeployWalletLink.s.sol";

// debuggging

contract InteractSpaceFactory is Interaction {
  // Deployments
  DeployArchitect architectHelper = new DeployArchitect();
  DeploySpace deploySpace = new DeploySpace();
  DeployWalletLink deployWalletLink = new DeployWalletLink();

  function __interact(uint256 deployerPk, address) public override {
    address spaceFactory = getDeployment("spaceFactory");

    vm.startBroadcast(deployerPk);
    IArchitect(spaceFactory).setSpaceArchitectImplementations(
      ISpaceOwner(getDeployment("spaceOwner")),
      IUserEntitlement(getDeployment("userEntitlement")),
      IRuleEntitlement(getDeployment("ruleEntitlement")),
      IWalletLink(getDeployment("walletLink")),
      IEntitlementChecker(getDeployment("entitlementChecker"))
    );
    vm.stopBroadcast();

    address architect = architectHelper.deploy();
    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
    cuts[0] = architectHelper.makeCut(
      architect,
      IDiamond.FacetCutAction.Replace
    );

    // upgrade architect facet
    vm.startBroadcast(deployerPk);
    IDiamondCut(spaceFactory).diamondCut({
      facetCuts: cuts,
      init: address(0),
      initPayload: ""
    });
    vm.stopBroadcast();

    address space = deploySpace.deploy();

    // set space implementation to new one
    vm.startBroadcast(deployerPk);
    ProxyManager(spaceFactory).setImplementation(space);
    vm.stopBroadcast();
  }
}
