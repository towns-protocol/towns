// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";
import {IImplementationRegistry} from "contracts/src/factory/facets/registry/IImplementationRegistry.sol";
import {IDiamondLoupe} from "contracts/src/diamond/facets/loupe/IDiamondLoupe.sol";
import {IProxyManager} from "contracts/src/diamond/proxy/manager/IProxyManager.sol";

// libraries

// contracts
import {Interaction} from "contracts/scripts/common/Interaction.s.sol";
import {DeployMultiInit} from "contracts/scripts/deployments/DeployMultiInit.s.sol";

// factory updates
import {DeployArchitect} from "contracts/scripts/deployments/facets/DeployArchitect.s.sol";
import {DeployImplementationRegistry} from "contracts/scripts/deployments/facets/DeployImplementationRegistry.s.sol";
import {DeployMetadata} from "contracts/scripts/deployments/facets/DeployMetadata.s.sol";
import {DeployWalletLink} from "contracts/scripts/deployments/facets/DeployWalletLink.s.sol";
import {DeploySpace} from "contracts/scripts/deployments/DeploySpace.s.sol";

// debuggging
import {console} from "forge-std/console.sol";

contract Migration_2024_04_17 is Interaction {
  // Space Manager
  DeployMultiInit multiInitHelper = new DeployMultiInit();
  DeployArchitect architectHelper = new DeployArchitect();
  DeployImplementationRegistry registryHelper =
    new DeployImplementationRegistry();
  DeployMetadata metadataHelper = new DeployMetadata();

  DeployWalletLink walletLinkHelper = new DeployWalletLink();
  DeploySpace spaceHelper = new DeploySpace();

  IDiamond.FacetCut[] operationsCuts;
  address[] operationAddresses;
  bytes[] operationDatas;

  IDiamond.FacetCut[] factoryCuts;
  address[] factoryAddresses;
  bytes[] factoryDatas;

  function __interact(address deployer) public override {
    address multiInit = multiInitHelper.deploy();

    // Space Operations
    address spaceOperator = getDeployment("baseRegistry");

    // Space Manager
    address spaceManager = getDeployment("spaceFactory");
    address architect = architectHelper.deploy();
    address registry = registryHelper.deploy();
    address walletLink = walletLinkHelper.deploy();
    address metadata = metadataHelper.deploy();

    //Replace the current Architect Facet with new one
    address facetToRemove = 0x6f06a8B586C3Ed53bA57834E83A87353e44B1969;
    factoryCuts.push(
      IDiamond.FacetCut({
        facetAddress: facetToRemove,
        action: IDiamond.FacetCutAction.Remove,
        functionSelectors: IDiamondLoupe(spaceManager).facetFunctionSelectors(
          facetToRemove
        )
      })
    );

    // Add new Facets (Registry, Metadata, WalletLink)
    factoryCuts.push(
      architectHelper.makeCut(architect, IDiamond.FacetCutAction.Add)
    );
    factoryCuts.push(
      registryHelper.makeCut(registry, IDiamond.FacetCutAction.Add)
    );
    factoryCuts.push(
      metadataHelper.makeCut(metadata, IDiamond.FacetCutAction.Add)
    );
    factoryCuts.push(
      walletLinkHelper.makeCut(walletLink, IDiamond.FacetCutAction.Add)
    );

    factoryAddresses.push(registry);
    factoryAddresses.push(metadata);
    factoryAddresses.push(walletLink);

    factoryDatas.push(registryHelper.makeInitData(""));
    factoryDatas.push(metadataHelper.makeInitData("SpaceFactory", ""));
    factoryDatas.push(walletLinkHelper.makeInitData(""));

    // Update the Diamond
    vm.startBroadcast(deployer);
    IDiamondCut(spaceManager).diamondCut({
      facetCuts: factoryCuts,
      init: multiInit,
      initPayload: multiInitHelper.makeInitData(factoryAddresses, factoryDatas)
    });
    IImplementationRegistry(spaceManager).addImplementation(spaceOperator);
    vm.stopBroadcast();

    // Deploy New Space Implementation
    address space = spaceHelper.deploy();

    // Update the Space Implementation on the Space Factory
    vm.startBroadcast(deployer);
    IProxyManager(spaceManager).setImplementation(space);
    vm.stopBroadcast();

    console.log("Migration_2024_04_17: done!");
  }
}
