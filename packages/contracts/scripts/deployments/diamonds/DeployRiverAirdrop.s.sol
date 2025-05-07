// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
import {IDiamondInitHelper} from "./IDiamondInitHelper.sol";

// libraries
import {DeployDiamondCut} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.sol";
import {DeployDiamondLoupe} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.sol";
import {DeployIntrospection} from "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.sol";
import {DeployOwnable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployOwnable.sol";
import {DeployMetadata} from "../facets/DeployMetadata.s.sol";
import {LibString} from "solady/utils/LibString.sol";

// contracts
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DiamondHelper} from "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";

// deployers
import {DeployFacet} from "../../common/DeployFacet.s.sol";
import {Deployer} from "../../common/Deployer.s.sol";
import {DeployDropFacet} from "scripts/deployments/facets/DeployDropFacet.s.sol";
import {DeployTownsPoints} from "scripts/deployments/facets/DeployTownsPoints.s.sol";

contract DeployRiverAirdrop is IDiamondInitHelper, DiamondHelper, Deployer {
    using LibString for string;

    address private BASE_REGISTRY;
    address private SPACE_FACTORY;

    DeployFacet private facetHelper = new DeployFacet();
    DeployDropFacet private dropHelper = new DeployDropFacet();
    DeployTownsPoints private pointsHelper = new DeployTownsPoints();

    address private multiInit;
    mapping(string => address) private facetDeployments;

    constructor() {
        facetDeployments["DropFacet"] = address(dropHelper);
        facetDeployments["TownsPoints"] = address(pointsHelper);
    }

    function versionName() public pure override returns (string memory) {
        return "riverAirdrop";
    }

    function setSpaceFactory(address spaceFactory) external {
        SPACE_FACTORY = spaceFactory;
    }

    function getSpaceFactory() internal returns (address) {
        if (SPACE_FACTORY != address(0)) {
            return SPACE_FACTORY;
        }

        return getDeployment("spaceFactory");
    }

    function setBaseRegistry(address baseRegistry) external {
        BASE_REGISTRY = baseRegistry;
    }

    function getBaseRegistry() internal returns (address) {
        if (BASE_REGISTRY != address(0)) {
            return BASE_REGISTRY;
        }

        return getDeployment("baseRegistry");
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
        address facet = dropHelper.deploy(deployer);
        addFacet(
            dropHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            dropHelper.makeInitData(getBaseRegistry())
        );

        facet = pointsHelper.deploy(deployer);
        addFacet(
            pointsHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            pointsHelper.makeInitData(getSpaceFactory())
        );

        facet = facetHelper.deploy("MetadataFacet", deployer);
        addFacet(
            DeployMetadata.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployMetadata.makeInitData(bytes32("RiverAirdrop"), "")
        );

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
            } else if (facetName.eq("MetadataFacet")) {
                address facet = facetHelper.deploy("MetadataFacet", deployer);
                addFacet(
                    DeployMetadata.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployMetadata.makeInitData(bytes32("RiverAirdrop"), "")
                );
            }
        }
    }

    function diamondInitHelper(
        address deployer,
        string[] memory facetNames
    ) external override returns (FacetCut[] memory) {
        diamondInitParamsFromFacets(deployer, facetNames);
        return baseFacets();
    }

    function __deploy(address deployer) internal override returns (address) {
        addImmutableCuts(deployer);

        Diamond.InitParams memory initDiamondCut = diamondInitParams(deployer);

        vm.broadcast(deployer);
        Diamond diamond = new Diamond(initDiamondCut);
        return address(diamond);
    }
}
