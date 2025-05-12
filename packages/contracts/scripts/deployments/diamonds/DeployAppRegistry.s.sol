// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries

// helpers

import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";

import {DeployFacet} from "../../common/DeployFacet.s.sol";
import {DeployDiamondCut} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.sol";
import {DeployDiamondLoupe} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.sol";
import {DeployIntrospection} from "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.sol";
import {DeployOwnable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployOwnable.sol";
import {DiamondHelper} from "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";
import {DeployMetadata} from "scripts/deployments/facets/DeployMetadata.s.sol";

// facets
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DeployAppRegistryFacet} from "scripts/deployments/facets/DeployAppRegistryFacet.s.sol";

contract DeployAppRegistry is DiamondHelper, Deployer {
    DeployFacet private facetHelper = new DeployFacet();

    address internal metadata;
    address internal multiInit;
    address internal diamondCut;
    address internal diamondLoupe;
    address internal introspection;
    address internal ownable;
    address internal appRegistry;

    string internal APP_REGISTRY_SCHEMA =
        "address app, address owner, address[] clients, bytes32[] permissions, ExecutionManifest manifest";

    function versionName() public pure override returns (string memory) {
        return "appRegistry";
    }

    function addImmutableCuts(address deployer) internal {
        multiInit = facetHelper.deploy("MultiInit", deployer);

        diamondCut = facetHelper.deploy("DiamondCutFacet", deployer);
        addFacet(
            DeployDiamondCut.makeCut(diamondCut, IDiamond.FacetCutAction.Add),
            diamondCut,
            DeployDiamondCut.makeInitData()
        );

        diamondLoupe = facetHelper.deploy("DiamondLoupeFacet", deployer);
        addFacet(
            DeployDiamondLoupe.makeCut(diamondLoupe, IDiamond.FacetCutAction.Add),
            diamondLoupe,
            DeployDiamondLoupe.makeInitData()
        );

        introspection = facetHelper.deploy("IntrospectionFacet", deployer);
        addFacet(
            DeployIntrospection.makeCut(introspection, IDiamond.FacetCutAction.Add),
            introspection,
            DeployIntrospection.makeInitData()
        );

        ownable = facetHelper.deploy("OwnableFacet", deployer);
        addFacet(
            DeployOwnable.makeCut(ownable, IDiamond.FacetCutAction.Add),
            ownable,
            DeployOwnable.makeInitData(deployer)
        );

        metadata = facetHelper.deploy("MetadataFacet", deployer);
        addFacet(
            DeployMetadata.makeCut(metadata, IDiamond.FacetCutAction.Add),
            metadata,
            DeployMetadata.makeInitData(bytes32("AppRegistry"), "")
        );
    }

    function diamondInitParams(address deployer) public returns (Diamond.InitParams memory) {
        appRegistry = facetHelper.deploy("AppRegistryFacet", deployer);
        addFacet(
            DeployAppRegistryFacet.makeCut(appRegistry, IDiamond.FacetCutAction.Add),
            appRegistry,
            DeployAppRegistryFacet.makeInitData(APP_REGISTRY_SCHEMA, address(0))
        );

        return
            Diamond.InitParams({
                baseFacets: baseFacets(),
                init: multiInit,
                initData: abi.encodeWithSelector(
                    MultiInit.multiInit.selector,
                    _initAddresses,
                    _initDatas
                )
            });
    }

    function __deploy(address deployer) internal override returns (address) {
        addImmutableCuts(deployer);

        Diamond.InitParams memory initDiamondCut = diamondInitParams(deployer);

        vm.broadcast(deployer);
        Diamond diamond = new Diamond(initDiamondCut);

        return address(diamond);
    }
}
