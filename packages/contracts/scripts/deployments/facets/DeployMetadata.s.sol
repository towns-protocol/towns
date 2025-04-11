// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

//contracts
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";
import {MetadataFacet} from "src/diamond/facets/metadata/MetadataFacet.sol";
import {DeployLib} from "@towns-protocol/diamond/scripts/common/DeployLib.sol";

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
        address,
        address facetAddress
    ) external override returns (FacetCut memory, bytes memory) {
        IDiamond.FacetCut memory facetCut = this.makeCut(facetAddress, IDiamond.FacetCutAction.Add);
        return (facetCut, makeInitData(bytes32("RiverAirdrop"), ""));
    }

    function versionName() public pure override returns (string memory) {
        return "facets/metadataFacet";
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.startBroadcast(deployer);
        MetadataFacet metadataFacet = new MetadataFacet();
        vm.stopBroadcast();
        return address(metadataFacet);
    }
}

library DeployMetadataLib {
    function selectors() public pure returns (bytes4[] memory _selectors) {
        _selectors = new bytes4[](4);
        _selectors[0] = MetadataFacet.contractType.selector;
        _selectors[1] = MetadataFacet.contractVersion.selector;
        _selectors[2] = MetadataFacet.contractURI.selector;
        _selectors[3] = MetadataFacet.setContractURI.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return
            IDiamond.FacetCut({
                action: action,
                facetAddress: facetAddress,
                functionSelectors: selectors()
            });
    }

    function initializer() public pure returns (bytes4) {
        return MetadataFacet.__MetadataFacet_init.selector;
    }

    function makeInitData(
        bytes32 contractType,
        string memory contractURI
    ) public pure returns (bytes memory) {
        return abi.encodeWithSelector(initializer(), contractType, contractURI);
    }

    function deploy() internal returns (address) {
        return DeployLib.deployCode("MetadataFacet.sol", "");
    }
}
