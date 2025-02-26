// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {IDiamondCut} from "@river-build/diamond/src/facets/cut/IDiamondCut.sol";

import {Diamond} from "@river-build/diamond/src/Diamond.sol";

// libraries
import "forge-std/console.sol";

// contracts
import {AlphaHelper} from "contracts/scripts/interactions/helpers/AlphaHelper.sol";

import {DeploySpace} from "contracts/scripts/deployments/diamonds/DeploySpace.s.sol";
import {DeploySpaceFactory} from "contracts/scripts/deployments/diamonds/DeploySpaceFactory.s.sol";
import {DeployBaseRegistry} from "contracts/scripts/deployments/diamonds/DeployBaseRegistry.s.sol";
import {DeploySpaceOwner} from "contracts/scripts/deployments/diamonds/DeploySpaceOwner.s.sol";
import {DeployRiverAirdrop} from "contracts/scripts/deployments/diamonds/DeployRiverAirdrop.s.sol";

contract InteractBaseAlpha is AlphaHelper {
  DeploySpace deploySpace = new DeploySpace();
  DeploySpaceFactory deploySpaceFactory = new DeploySpaceFactory();
  DeployBaseRegistry deployBaseRegistry = new DeployBaseRegistry();
  DeploySpaceOwner deploySpaceOwner = new DeploySpaceOwner();
  DeployRiverAirdrop deployRiverAirdrop = new DeployRiverAirdrop();

  function __interact(address deployer) internal override {
    vm.pauseGasMetering();
    vm.setEnv("OVERRIDE_DEPLOYMENTS", "1");
    address space = getDeployment("space");
    address spaceOwner = getDeployment("spaceOwner");
    address spaceFactory = getDeployment("spaceFactory");
    address baseRegistry = getDeployment("baseRegistry");
    address riverAirdrop = getDeployment("riverAirdrop");

    removeRemoteFacets(deployer, space);
    removeRemoteFacets(deployer, spaceOwner);
    removeRemoteFacets(deployer, spaceFactory);
    removeRemoteFacets(deployer, baseRegistry);
    removeRemoteFacets(deployer, riverAirdrop);

    // Deploy Space
    try this.deploySpaceCuts(deployer, space) {
      console.log("Space deployment successful");
    } catch Error(string memory reason) {
      console.log("Space deployment failed:", reason);
    }

    // Deploy Space Owner
    try this.deploySpaceOwnerCuts(deployer, spaceOwner) {
      console.log("Space Owner deployment successful");
    } catch Error(string memory reason) {
      console.log("Space Owner deployment failed:", reason);
    }

    // Deploy Space Factory
    try this.deploySpaceFactoryCuts(deployer, spaceFactory) {
      console.log("Space Factory deployment successful");
    } catch Error(string memory reason) {
      console.log("Space Factory deployment failed:", reason);
    }

    // Deploy Base Registry
    try this.deployBaseRegistryCuts(deployer, baseRegistry) {
      console.log("Base Registry deployment successful");
    } catch Error(string memory reason) {
      console.log("Base Registry deployment failed:", reason);
    }

    // Deploy River Airdrop
    try this.deployRiverAirdropCuts(deployer, riverAirdrop) {
      console.log("River Airdrop deployment successful");
    } catch Error(string memory reason) {
      console.log("River Airdrop deployment failed:", reason);
    }

    vm.resumeGasMetering();
  }

  function deploySpaceCuts(address deployer, address space) external {
    deploySpace.diamondInitParams(deployer);
    FacetCut[] memory newCuts = deploySpace.getCuts();
    vm.broadcast(deployer);
    IDiamondCut(space).diamondCut(newCuts, address(0), "");
  }

  function deploySpaceOwnerCuts(address deployer, address spaceOwner) external {
    deploySpaceOwner.diamondInitParams(deployer);
    FacetCut[] memory newCuts = deploySpaceOwner.getCuts();
    vm.broadcast(deployer);
    IDiamondCut(spaceOwner).diamondCut(newCuts, address(0), "");
  }

  function deploySpaceFactoryCuts(
    address deployer,
    address spaceFactory
  ) external {
    deploySpaceFactory.diamondInitParams(deployer);
    FacetCut[] memory newCuts = deploySpaceFactory.getCuts();
    address spaceFactoryInit = deploySpaceFactory.spaceFactoryInit();
    bytes memory initData = deploySpaceFactory.spaceFactoryInitData();
    vm.broadcast(deployer);
    IDiamondCut(spaceFactory).diamondCut(newCuts, spaceFactoryInit, initData);
  }

  function deployBaseRegistryCuts(
    address deployer,
    address baseRegistry
  ) external {
    deployBaseRegistry.diamondInitParams(deployer);
    FacetCut[] memory newCuts = deployBaseRegistry.getCuts();
    vm.broadcast(deployer);
    IDiamondCut(baseRegistry).diamondCut(newCuts, address(0), "");
  }

  function deployRiverAirdropCuts(
    address deployer,
    address riverAirdrop
  ) external {
    deployRiverAirdrop.diamondInitParams(deployer);
    FacetCut[] memory newCuts = deployRiverAirdrop.getCuts();
    vm.broadcast(deployer);
    IDiamondCut(riverAirdrop).diamondCut(newCuts, address(0), "");
  }
}
