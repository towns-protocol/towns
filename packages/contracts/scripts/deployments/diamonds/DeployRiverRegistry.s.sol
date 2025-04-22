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
import {LibString} from "solady/utils/LibString.sol";

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
    using LibString for string;

    DeployFacet private facetHelper = new DeployFacet();
    DeployNodeRegistry private nodeRegistryHelper = new DeployNodeRegistry();
    DeployStreamRegistry private streamRegistryHelper = new DeployStreamRegistry();
    DeployOperatorRegistry private operatorRegistryHelper = new DeployOperatorRegistry();
    DeployRiverConfig private riverConfigHelper = new DeployRiverConfig();

    address private multiInit;

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

        address facet = facetHelper.deploy("DiamondCutFacet", deployer);
        addFacet(
            DeployDiamondCut.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployDiamondCut.makeInitData()
        );

        facet = facetHelper.deploy("DiamondLoupeFacet", deployer);
        addFacet(
            DeployDiamondLoupe.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployDiamondLoupe.makeInitData()
        );

        facet = facetHelper.deploy("IntrospectionFacet", deployer);
        addFacet(
            DeployIntrospection.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployIntrospection.makeInitData()
        );

        facet = facetHelper.deploy("OwnableFacet", deployer);
        addFacet(
            DeployOwnable.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployOwnable.makeInitData(deployer)
        );
    }

    function diamondInitParams(address deployer) public returns (Diamond.InitParams memory) {
        address[] memory operators = new address[](1);
        operators[0] = deployer;
        address facet = operatorRegistryHelper.deploy(deployer);
        addFacet(
            operatorRegistryHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            operatorRegistryHelper.makeInitData(operators)
        );

        address[] memory configManagers = new address[](1);
        configManagers[0] = deployer;
        facet = riverConfigHelper.deploy(deployer);
        addFacet(
            riverConfigHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            riverConfigHelper.makeInitData(configManagers)
        );

        facet = nodeRegistryHelper.deploy(deployer);
        addCut(nodeRegistryHelper.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = streamRegistryHelper.deploy(deployer);
        addCut(streamRegistryHelper.makeCut(facet, IDiamond.FacetCutAction.Add));

        return
            Diamond.InitParams({
                baseFacets: baseFacets(),
                init: multiInit,
                initData: abi.encodeCall(MultiInit.multiInit, (_initAddresses, _initDatas))
            });
    }

    function diamondInitParamsFromFacets(address deployer, string[] memory facets) public {
        for (uint256 i; i < facets.length; ++i) {
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
