// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {DeployDiamondCut} from
    "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from
    "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from
    "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployOwnable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployOwnable.s.sol";

// contracts
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DiamondHelper} from "contracts/test/diamond/Diamond.t.sol";

// deployers
import {DeployFacet} from "../../common/DeployFacet.s.sol";
import {Deployer} from "../../common/Deployer.s.sol";
import {DeployDropFacet} from "contracts/scripts/deployments/facets/DeployDropFacet.s.sol";
import {DeployMetadata} from "contracts/scripts/deployments/facets/DeployMetadata.s.sol";
import {DeployTownsPoints} from "contracts/scripts/deployments/facets/DeployTownsPoints.s.sol";

contract DeployRiverAirdrop is DiamondHelper, Deployer {
    address internal BASE_REGISTRY = address(0);
    address internal SPACE_FACTORY = address(0);

    DeployFacet private facetHelper = new DeployFacet();
    DeployDropFacet dropHelper = new DeployDropFacet();
    DeployTownsPoints pointsHelper = new DeployTownsPoints();
    DeployMetadata metadataHelper = new DeployMetadata();

    address multiInit;
    address diamondCut;
    address diamondLoupe;
    address introspection;
    address ownable;

    address dropFacet;
    address pointsFacet;
    address metadata;

    mapping(string => address) private facetDeployments;

    constructor() {
        facetDeployments["DropFacet"] = address(dropHelper);
        facetDeployments["TownsPoints"] = address(pointsHelper);
        facetDeployments["MetadataFacet"] = address(metadataHelper);
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
        dropFacet = dropHelper.deploy(deployer);
        pointsFacet = pointsHelper.deploy(deployer);
        metadata = metadataHelper.deploy(deployer);

        addFacet(
            dropHelper.makeCut(dropFacet, IDiamond.FacetCutAction.Add),
            dropFacet,
            dropHelper.makeInitData(getBaseRegistry())
        );
        addFacet(
            pointsHelper.makeCut(pointsFacet, IDiamond.FacetCutAction.Add),
            pointsFacet,
            pointsHelper.makeInitData(getSpaceFactory())
        );
        addFacet(
            metadataHelper.makeCut(metadata, IDiamond.FacetCutAction.Add),
            metadata,
            metadataHelper.makeInitData(bytes32("RiverAirdrop"), "")
        );

        return Diamond.InitParams({
            baseFacets: baseFacets(),
            init: multiInit,
            initData: abi.encodeWithSelector(MultiInit.multiInit.selector, _initAddresses, _initDatas)
        });
    }

    function diamondInitParamsFromFacets(address deployer, string[] memory facets) public {
        for (uint256 i = 0; i < facets.length; i++) {
            string memory facetName = facets[i];
            address facetHelperAddress = facetDeployments[facetName];
            if (facetHelperAddress != address(0)) {
                // deploy facet
                address facetAddress = Deployer(facetHelperAddress).deploy(deployer);
                (FacetCut memory cut, bytes memory config) =
                    FacetHelper(facetHelperAddress).facetInitHelper(deployer, facetAddress);
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
    )
        external
        override
        returns (FacetCut[] memory)
    {
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
