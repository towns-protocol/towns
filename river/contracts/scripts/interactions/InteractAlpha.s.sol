// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";

import {Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// contracts
import {AlphaHelper} from "contracts/scripts/interactions/helpers/AlphaHelper.sol";

import {DeploySpace} from "contracts/scripts/deployments/diamonds/DeploySpace.s.sol";
import {DeploySpaceFactory} from "contracts/scripts/deployments/diamonds/DeploySpaceFactory.s.sol";
import {DeployBaseRegistry} from "contracts/scripts/deployments/diamonds/DeployBaseRegistry.s.sol";
import {DeploySpaceOwner} from "contracts/scripts/deployments/diamonds/DeploySpaceOwner.s.sol";

contract InteractAlpha is AlphaHelper {
  DeploySpace deploySpace = new DeploySpace();
  DeploySpaceFactory deploySpaceFactory = new DeploySpaceFactory();
  DeployBaseRegistry deployBaseRegistry = new DeployBaseRegistry();
  DeploySpaceOwner deploySpaceOwner = new DeploySpaceOwner();

  function __interact(address deployer) internal override {
    vm.setEnv("OVERRIDE_DEPLOYMENTS", "1");
    address space = getDeployment("space");
    address spaceOwner = getDeployment("spaceOwner");
    address spaceFactory = getDeployment("spaceFactory");
    address baseRegistry = getDeployment("baseRegistry");

    FacetCut[] memory newCuts;

    removeRemoteFacets(deployer, space);
    removeRemoteFacets(deployer, spaceOwner);
    removeRemoteFacets(deployer, spaceFactory);
    removeRemoteFacets(deployer, baseRegistry);

    // Deploy Space
    deploySpace.diamondInitParams(deployer);
    newCuts = deploySpace.getCuts();
    vm.broadcast(deployer);
    IDiamondCut(space).diamondCut(newCuts, address(0), "");

    // Deploy Space Owner
    deploySpaceOwner.diamondInitParams(deployer);
    newCuts = deploySpaceOwner.getCuts();
    vm.broadcast(deployer);
    IDiamondCut(spaceOwner).diamondCut(newCuts, address(0), "");

    // Deploy Space Factory
    deploySpaceFactory.diamondInitParams(deployer);
    newCuts = deploySpaceFactory.getCuts();
    address spaceFactoryInit = deploySpaceFactory.spaceFactoryInit();
    bytes memory initData = deploySpaceFactory.spaceFactoryInitData();
    vm.broadcast(deployer);
    IDiamondCut(spaceFactory).diamondCut(newCuts, spaceFactoryInit, initData);

    // Deploy Base Registry
    deployBaseRegistry.diamondInitParams(deployer);
    newCuts = deployBaseRegistry.getCuts();
    vm.broadcast(deployer);
    IDiamondCut(baseRegistry).diamondCut(newCuts, address(0), "");
  }
}
