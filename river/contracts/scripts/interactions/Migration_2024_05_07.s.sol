// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";
import {IProxyManager} from "contracts/src/diamond/proxy/manager/IProxyManager.sol";

// libraries

// contracts
import {Interaction} from "contracts/scripts/common/Interaction.s.sol";

// space updates
import {DeploySpace} from "contracts/scripts/deployments/DeploySpace.s.sol";
import {DeployArchitect} from "contracts/scripts/deployments/facets/DeployArchitect.s.sol";

// debuggging
import {console} from "forge-std/console.sol";

contract Migration_2024_05_07 is Interaction {
  DeployArchitect architectHelper = new DeployArchitect();
  DeploySpace spaceHelper = new DeploySpace();

  IDiamond.FacetCut[] cuts;

  function __interact(address deployer) public override {
    address spaceManager = getDeployment("spaceFactory");

    address space = spaceHelper.deploy();
    address architect = architectHelper.deploy();

    cuts.push(
      architectHelper.makeCut(architect, IDiamond.FacetCutAction.Replace)
    );

    vm.startBroadcast(deployer);
    IDiamondCut(spaceManager).diamondCut({
      facetCuts: cuts,
      init: address(0),
      initPayload: ""
    });
    IProxyManager(spaceManager).setImplementation(space);
    vm.stopBroadcast();

    console.log("Migration_2024_05_01: done!");
  }
}
