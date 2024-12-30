// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IDiamond} from "@river-build/diamond/src/IDiamond.sol";

//libraries
import "forge-std/console.sol";

//contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {MetadataFacet} from "contracts/src/diamond/facets/metadata/MetadataFacet.sol";

contract DeployMetadata is FacetHelper, Deployer {
  constructor() {
    addSelector(MetadataFacet.contractType.selector);
    addSelector(MetadataFacet.contractVersion.selector);
    addSelector(MetadataFacet.contractURI.selector);
    addSelector(MetadataFacet.setContractURI.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return MetadataFacet.__MetadataFacet_init.selector;
  }

  function makeInitData(
    bytes32 contractType,
    string memory contractURI
  ) public pure returns (bytes memory) {
    return abi.encodeWithSelector(initializer(), contractType, contractURI);
  }

  function facetInitHelper(
    address deployer,
    address facetAddress
  ) external override returns (FacetCut memory, bytes memory) {
    IDiamond.FacetCut memory facetCut = this.makeCut(
      facetAddress,
      IDiamond.FacetCutAction.Add
    );
    console.log("facetInitHelper: deployer", deployer);
    return (facetCut, makeInitData(bytes32("RiverAirdrop"), ""));
  }

  function versionName() public pure override returns (string memory) {
    return "metadataFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    MetadataFacet metadataFacet = new MetadataFacet();
    vm.stopBroadcast();
    return address(metadataFacet);
  }
}
