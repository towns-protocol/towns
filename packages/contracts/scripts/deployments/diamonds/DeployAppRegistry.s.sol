// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
import {IModuleRegistry} from "src/modules/interfaces/IModuleRegistry.sol";
// libraries

// helpers

import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";

import {DeployFacet} from "../../common/DeployFacet.s.sol";
import {DeployDiamondCut} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployOwnable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployOwnable.s.sol";
import {DiamondHelper} from "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";
import {DeployMetadataLib} from "scripts/deployments/facets/DeployMetadata.s.sol";

// facets
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DeployModuleRegistry} from "scripts/deployments/facets/DeployModuleRegistry.s.sol";

contract DeployAppRegistry is DiamondHelper, Deployer {
    DeployFacet private facetHelper = new DeployFacet();

    address internal metadata;
    address internal multiInit;
    address internal diamondCut;
    address internal diamondLoupe;
    address internal introspection;
    address internal ownable;
    address internal moduleRegistry;

    string internal MODULE_REGISTRY_SCHEMA =
        "address module, address owner, address[] clients, bytes32[] permissions, ExecutionManifest manifest";

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
            DeployMetadataLib.makeCut(metadata, IDiamond.FacetCutAction.Add),
            metadata,
            DeployMetadataLib.makeInitData(bytes32("AppRegistry"), "")
        );
    }

    function diamondInitParams(address deployer) public returns (Diamond.InitParams memory) {
        moduleRegistry = facetHelper.deploy("ModuleRegistry", deployer);
        addFacet(
            DeployModuleRegistry.makeCut(moduleRegistry, IDiamond.FacetCutAction.Add),
            moduleRegistry,
            DeployModuleRegistry.makeInitData(MODULE_REGISTRY_SCHEMA, address(0))
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
