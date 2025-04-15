// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
import {IDiamondInitHelper} from "./IDiamondInitHelper.sol";

// libraries
import {DeployDiamondCut} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployOwnable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployOwnable.s.sol";

// contracts
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DiamondHelper} from "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";

// deployers
import {DeployFacet} from "../../common/DeployFacet.s.sol";
import {Deployer} from "../../common/Deployer.s.sol";
import {DeployNodeRegistry} from "scripts/deployments/facets/DeployNodeRegistry.s.sol";
import {DeployOperatorRegistry} from "scripts/deployments/facets/DeployOperatorRegistry.s.sol";
import {DeployRiverConfig} from "scripts/deployments/facets/DeployRiverConfig.s.sol";
import {DeployStreamRegistry} from "scripts/deployments/facets/DeployStreamRegistry.s.sol";

contract DeployRiverRegistry is IDiamondInitHelper, DiamondHelper, Deployer {
    DeployFacet private facetHelper = new DeployFacet();
    DeployNodeRegistry internal nodeRegistryHelper = new DeployNodeRegistry();
    DeployStreamRegistry internal streamRegistryHelper = new DeployStreamRegistry();
    DeployOperatorRegistry internal operatorRegistryHelper = new DeployOperatorRegistry();
    DeployRiverConfig internal riverConfigHelper = new DeployRiverConfig();

    address internal multiInit;
    address internal diamondCut;
    address internal diamondLoupe;
    address internal introspection;
    address internal ownable;
    address internal nodeRegistry;
    address internal streamRegistry;
    address internal operatorRegistry;
    address internal riverConfig;

    address[] internal operators = new address[](1);
    address[] internal configManagers = new address[](1);

    mapping(string => address) private facetDeployments;

    constructor() {
        facetDeployments["RiverConfig"] = address(riverConfigHelper);
        facetDeployments["NodeRegistry"] = address(nodeRegistryHelper);
        facetDeployments["StreamRegistry"] = address(streamRegistryHelper);
        facetDeployments["OperatorRegistry"] = address(operatorRegistryHelper);
    }

    function versionName() public pure override returns (string memory) {
        return "riverRegistry";
    }

    function addImmutableCuts(address deployer) internal {
        multiInit = facetHelper.deploy("MultiInit", deployer);
        diamondCut = facetHelper.deploy("DiamondCutFacet", deployer);
        diamondLoupe = facetHelper.deploy("DiamondLoupeFacet", deployer);
        introspection = facetHelper.deploy("IntrospectionFacet", deployer);
        ownable = facetHelper.deploy("OwnableFacet", deployer);

        addFacet(
            DeployDiamondCut.makeCut(diamondCut, IDiamond.FacetCutAction.Add),
            diamondCut,
            DeployDiamondCut.makeInitData()
        );
        addFacet(
            DeployDiamondLoupe.makeCut(diamondLoupe, IDiamond.FacetCutAction.Add),
            diamondLoupe,
            DeployDiamondLoupe.makeInitData()
        );
        addFacet(
            DeployIntrospection.makeCut(introspection, IDiamond.FacetCutAction.Add),
            introspection,
            DeployIntrospection.makeInitData()
        );
        addFacet(
            DeployOwnable.makeCut(ownable, IDiamond.FacetCutAction.Add),
            ownable,
            DeployOwnable.makeInitData(deployer)
        );
    }

    function diamondInitParams(address deployer) public returns (Diamond.InitParams memory) {
        riverConfig = riverConfigHelper.deploy(deployer);
        nodeRegistry = nodeRegistryHelper.deploy(deployer);
        streamRegistry = streamRegistryHelper.deploy(deployer);
        operatorRegistry = operatorRegistryHelper.deploy(deployer);

        operators[0] = deployer;
        configManagers[0] = deployer;

        addFacet(
            operatorRegistryHelper.makeCut(operatorRegistry, IDiamond.FacetCutAction.Add),
            operatorRegistry,
            operatorRegistryHelper.makeInitData(operators)
        );
        addFacet(
            riverConfigHelper.makeCut(riverConfig, IDiamond.FacetCutAction.Add),
            riverConfig,
            riverConfigHelper.makeInitData(configManagers)
        );
        addCut(nodeRegistryHelper.makeCut(nodeRegistry, IDiamond.FacetCutAction.Add));
        addCut(streamRegistryHelper.makeCut(streamRegistry, IDiamond.FacetCutAction.Add));

        return
            Diamond.InitParams({
                baseFacets: baseFacets(),
                init: multiInit,
                initData: abi.encodeCall(MultiInit.multiInit, (_initAddresses, _initDatas))
            });
    }

    function diamondInitParamsFromFacets(address deployer, string[] memory facets) public {
        for (uint256 i = 0; i < facets.length; i++) {
            string memory facetName = facets[i];
            address facetHelperAddress = facetDeployments[facetName];
            if (facetHelperAddress != address(0)) {
                // deploy facet
                address facetAddress = Deployer(facetHelperAddress).deploy(deployer);
                (FacetCut memory cut, bytes memory config) = FacetHelper(facetHelperAddress)
                    .facetInitHelper(deployer, facetAddress);
                if (config.length > 0) {
                    addFacet(cut, facetAddress, config);
                } else {
                    addCut(cut);
                }
            }
        }
    }

    function diamondInitHelper(
        address deployer,
        string[] memory facetNames
    ) external override returns (FacetCut[] memory) {
        diamondInitParamsFromFacets(deployer, facetNames);
        return this.getCuts();
    }

    function __deploy(address deployer) internal override returns (address) {
        addImmutableCuts(deployer);

        Diamond.InitParams memory initDiamondCut = diamondInitParams(deployer);

        vm.broadcast(deployer);
        Diamond diamond = new Diamond(initDiamondCut);
        return address(diamond);
    }
}
