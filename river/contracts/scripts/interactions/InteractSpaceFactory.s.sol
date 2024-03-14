// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces
import {IProxyManager} from "contracts/src/diamond/proxy/manager/IProxyManager.sol";
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";

//libraries

//contracts
import {Interaction} from "../common/Interaction.s.sol";
import {ProxyManager} from "contracts/src/diamond/proxy/manager/ProxyManager.sol";
import {DeployArchitect} from "contracts/scripts/deployments/facets/DeployArchitect.s.sol";
import {DeploySpace} from "contracts/scripts/deployments/DeploySpace.s.sol";
import {ArchitectHelper} from "contracts/test/spaces/architect/ArchitectHelper.sol";
import {SpaceHelper} from "contracts/test/spaces/SpaceHelper.sol";
import {Architect} from "contracts/src/spaces/facets/architect/Architect.sol";

// debuggging
import {console} from "forge-std/console.sol";

contract InteractSpaceFactory is Interaction, SpaceHelper {
  DeployArchitect deployArchitect = new DeployArchitect();
  DeploySpace deploySpace = new DeploySpace();
  ArchitectHelper architectHelper = new ArchitectHelper();

  function __interact(uint256 deployerPk, address) public override {
    address spaceFactory = getDeployment("spaceFactory");

    address architect = deployArchitect.deploy();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);

    cuts[0] = IDiamond.FacetCut({
      facetAddress: architect,
      action: IDiamond.FacetCutAction.Replace,
      functionSelectors: architectHelper.selectors()
    });

    // upgrade architect facet
    vm.startBroadcast(deployerPk);
    IDiamondCut(spaceFactory).diamondCut({
      facetCuts: cuts,
      init: architect,
      initPayload: abi.encodeWithSelector(
        architectHelper.initializer(),
        getDeployment("spaceOwner"),
        getDeployment("userEntitlement"),
        getDeployment("ruleEntitlement"),
        getDeployment("walletLink")
      )
    });
    vm.stopBroadcast();

    address space = deploySpace.deploy();

    // set space implementation to new one
    vm.startBroadcast(deployerPk);
    ProxyManager(spaceFactory).setImplementation(space);
    vm.stopBroadcast();

    console.log("Space implementation updated to new one.", space);
    address newImpl = ProxyManager(spaceFactory).getImplementation(
      IProxyManager.getImplementation.selector
    );

    console.log("New space implementation: ", newImpl);
  }
}
