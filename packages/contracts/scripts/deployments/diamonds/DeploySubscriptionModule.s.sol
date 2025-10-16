// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamondInitHelper} from "./IDiamondInitHelper.sol";

// libraries
import {DeployDiamondCut} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.sol";
import {DeployDiamondLoupe} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.sol";
import {DeployIntrospection} from "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.sol";
import {DeployOwnable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployOwnable.sol";
import {DeployMetadata} from "../facets/DeployMetadata.s.sol";
import {DeploySubscriptionModuleFacet} from "../facets/DeploySubscriptionModuleFacet.s.sol";
import {LibString} from "solady/utils/LibString.sol";

// contracts
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DiamondHelper} from "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";

// deployers
import {DeployFacet} from "../../common/DeployFacet.s.sol";
import {Deployer} from "../../common/Deployer.s.sol";

contract DeploySubscriptionModule is DiamondHelper, Deployer, IDiamondInitHelper {
    using LibString for string;

    address private SPACE_FACTORY;

    DeployFacet private facetHelper = new DeployFacet();

    bytes32 internal constant METADATA_NAME = bytes32("SubscriptionModule");

    function setSpaceFactory(address factory) public {
        SPACE_FACTORY = factory;
    }

    function getSpaceFactory() public returns (address) {
        if (SPACE_FACTORY != address(0)) {
            return SPACE_FACTORY;
        }

        return getDeployment("spaceFactory");
    }

    function versionName() public pure override returns (string memory) {
        return "subscriptionModule";
    }

    function diamondInitHelper(
        address deployer,
        string[] memory facetNames
    ) external override returns (FacetCut[] memory) {
        // Queue up all requested facets for batch deployment
        for (uint256 i; i < facetNames.length; ++i) {
            facetHelper.add(facetNames[i]);
        }

        // Deploy all requested facets in a single batch transaction
        facetHelper.deployBatch(deployer);

        for (uint256 i; i < facetNames.length; ++i) {
            string memory facetName = facetNames[i];
            address facet = facetHelper.getDeployedAddress(facetName);

            if (facetName.eq("SubscriptionModuleFacet")) {
                addCut(
                    makeCut(facet, FacetCutAction.Add, DeploySubscriptionModuleFacet.selectors())
                );
            }
        }

        return baseFacets();
    }

    function diamondInitParams(address deployer) public returns (Diamond.InitParams memory) {
        // Queue up feature facets for batch deployment
        facetHelper.add("MultiInit");
        facetHelper.add("SubscriptionModuleFacet");

        // Deploy all facets in a batch
        facetHelper.deployBatch(deployer);

        // Add feature facets
        address facet = facetHelper.getDeployedAddress("SubscriptionModuleFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeploySubscriptionModuleFacet.selectors()),
            facet,
            DeploySubscriptionModuleFacet.makeInitData(getSpaceFactory())
        );

        address multiInit = facetHelper.getDeployedAddress("MultiInit");

        return
            Diamond.InitParams({
                baseFacets: baseFacets(),
                init: multiInit,
                initData: abi.encodeCall(MultiInit.multiInit, (_initAddresses, _initDatas))
            });
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          Internal                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _coreFacets(address deployer) private {
        // Queue up all core facets for batch deployment
        facetHelper.add("DiamondCutFacet");
        facetHelper.add("DiamondLoupeFacet");
        facetHelper.add("IntrospectionFacet");
        facetHelper.add("OwnableFacet");
        facetHelper.add("MetadataFacet");

        // Get predicted addresses
        address facet = facetHelper.predictAddress("DiamondCutFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployDiamondCut.selectors()),
            facet,
            DeployDiamondCut.makeInitData()
        );

        facet = facetHelper.predictAddress("DiamondLoupeFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployDiamondLoupe.selectors()),
            facet,
            DeployDiamondLoupe.makeInitData()
        );

        facet = facetHelper.predictAddress("IntrospectionFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployIntrospection.selectors()),
            facet,
            DeployIntrospection.makeInitData()
        );

        facet = facetHelper.predictAddress("OwnableFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployOwnable.selectors()),
            facet,
            DeployOwnable.makeInitData(deployer)
        );

        facet = facetHelper.predictAddress("MetadataFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployMetadata.selectors()),
            facet,
            DeployMetadata.makeInitData(METADATA_NAME, "")
        );
    }

    function __deploy(address deployer) internal override returns (address) {
        _coreFacets(deployer);

        Diamond.InitParams memory initDiamondCut = diamondInitParams(deployer);

        vm.broadcast(deployer);
        Diamond diamond = new Diamond(initDiamondCut);

        return address(diamond);
    }
}
