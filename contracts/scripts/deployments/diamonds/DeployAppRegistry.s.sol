// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries

// helpers

import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";

import {DeployDiamondCut} from "contracts/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "contracts/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "contracts/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployOwnable} from "contracts/scripts/deployments/facets/DeployOwnable.s.sol";
import {DiamondHelper} from "contracts/test/diamond/Diamond.t.sol";

// deployers
import {DeployMultiInit} from "contracts/scripts/deployments/utils/DeployMultiInit.s.sol";

// facets
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DeployAttestationRegistry} from
    "contracts/scripts/deployments/facets/DeployAttestationRegistry.s.sol";

import {DeployModuleRegistry} from "contracts/scripts/deployments/facets/DeployModuleRegistry.s.sol";
import {DeploySchemaRegistry} from "contracts/scripts/deployments/facets/DeploySchemaRegistry.s.sol";

contract DeployAppRegistry is DiamondHelper, Deployer {
    DeployDiamondCut internal cutHelper = new DeployDiamondCut();
    DeployDiamondLoupe internal loupeHelper = new DeployDiamondLoupe();
    DeployIntrospection internal introspectionHelper = new DeployIntrospection();
    DeployOwnable internal ownableHelper = new DeployOwnable();

    // facets
    DeploySchemaRegistry deploySchemaRegistry = new DeploySchemaRegistry();
    DeployAttestationRegistry deployAttestationRegistry = new DeployAttestationRegistry();
    DeployModuleRegistry deployModuleRegistry = new DeployModuleRegistry();

    // deployer
    DeployMultiInit deployMultiInit = new DeployMultiInit();

    address internal multiInit;

    address internal diamondCut;
    address internal diamondLoupe;
    address internal introspection;
    address internal ownable;
    address internal schemaRegistry;
    address internal attestationRegistry;
    address internal moduleRegistry;

    function versionName() public pure override returns (string memory) {
        return "appRegistry";
    }

    function addImmutableCuts(address deployer) internal {
        multiInit = deployMultiInit.deploy(deployer);
        diamondCut = cutHelper.deploy(deployer);
        diamondLoupe = loupeHelper.deploy(deployer);
        introspection = introspectionHelper.deploy(deployer);
        ownable = ownableHelper.deploy(deployer);

        addFacet(
            cutHelper.makeCut(diamondCut, IDiamond.FacetCutAction.Add),
            diamondCut,
            cutHelper.makeInitData("")
        );
        addFacet(
            loupeHelper.makeCut(diamondLoupe, IDiamond.FacetCutAction.Add),
            diamondLoupe,
            loupeHelper.makeInitData("")
        );
        addFacet(
            introspectionHelper.makeCut(introspection, IDiamond.FacetCutAction.Add),
            introspection,
            introspectionHelper.makeInitData("")
        );
        addFacet(
            ownableHelper.makeCut(ownable, IDiamond.FacetCutAction.Add),
            ownable,
            ownableHelper.makeInitData(deployer)
        );
    }

    function diamondInitParams(address deployer) public returns (Diamond.InitParams memory) {
        schemaRegistry = deploySchemaRegistry.deploy(deployer);
        attestationRegistry = deployAttestationRegistry.deploy(deployer);
        moduleRegistry = deployModuleRegistry.deploy(deployer);
        addFacet(
            deploySchemaRegistry.makeCut(schemaRegistry, IDiamond.FacetCutAction.Add),
            schemaRegistry,
            deploySchemaRegistry.makeInitData("")
        );
        addFacet(
            deployAttestationRegistry.makeCut(attestationRegistry, IDiamond.FacetCutAction.Add),
            attestationRegistry,
            deployAttestationRegistry.makeInitData("")
        );
        addFacet(
            deployModuleRegistry.makeCut(moduleRegistry, IDiamond.FacetCutAction.Add),
            moduleRegistry,
            deployModuleRegistry.makeInitData("")
        );

        return Diamond.InitParams({
            baseFacets: baseFacets(),
            init: multiInit,
            initData: abi.encodeWithSelector(MultiInit.multiInit.selector, _initAddresses, _initDatas)
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
