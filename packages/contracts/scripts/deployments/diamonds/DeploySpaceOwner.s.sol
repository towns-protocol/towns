// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interface
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
import {IDiamondInitHelper} from "./IDiamondInitHelper.sol";

// libraries
import {DeployDiamondCut} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.sol";
import {DeployDiamondLoupe} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.sol";
import {DeployEIP712Facet} from "@towns-protocol/diamond/scripts/deployments/facets/DeployEIP712Facet.sol";
import {DeployIntrospection} from "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.sol";
import {DeployOwnable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployOwnable.sol";
import {LibString} from "solady/utils/LibString.sol";
import {DeploySpaceOwnerFacet} from "../facets/DeploySpaceOwnerFacet.s.sol";
import {DeployGuardianFacet} from "../facets/DeployGuardianFacet.s.sol";
import {DeployMetadata} from "../facets/DeployMetadata.s.sol";

// contracts
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DiamondHelper} from "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";

// deployers
import {DeployFacet} from "../../common/DeployFacet.s.sol";
import {Deployer} from "../../common/Deployer.s.sol";

contract DeploySpaceOwner is IDiamondInitHelper, DiamondHelper, Deployer {
    using LibString for string;

    DeployFacet private facetHelper = new DeployFacet();
    address private multiInit;

    function versionName() public pure override returns (string memory) {
        return "spaceOwner";
    }

    function addImmutableCuts(address deployer) internal {
        // Queue up all core facets for batch deployment
        facetHelper.add("MultiInit");
        facetHelper.add("DiamondCutFacet");
        facetHelper.add("DiamondLoupeFacet");
        facetHelper.add("IntrospectionFacet");
        facetHelper.add("OwnableFacet");

        // Get predicted addresses
        multiInit = facetHelper.predictAddress("MultiInit");

        address facet = facetHelper.predictAddress("DiamondCutFacet");
        addFacet(
            DeployDiamondCut.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployDiamondCut.makeInitData()
        );

        facet = facetHelper.predictAddress("DiamondLoupeFacet");
        addFacet(
            DeployDiamondLoupe.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployDiamondLoupe.makeInitData()
        );

        facet = facetHelper.predictAddress("IntrospectionFacet");
        addFacet(
            DeployIntrospection.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployIntrospection.makeInitData()
        );

        facet = facetHelper.predictAddress("OwnableFacet");
        addFacet(
            DeployOwnable.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployOwnable.makeInitData(deployer)
        );
    }

    function diamondInitParams(address deployer) public returns (Diamond.InitParams memory) {
        // Queue up all feature facets for batch deployment
        facetHelper.add("SpaceOwner");
        facetHelper.add("EIP712Facet");
        facetHelper.add("GuardianFacet");
        facetHelper.add("MetadataFacet");

        // Deploy all facets in a single batch transaction
        facetHelper.deployBatch(deployer);

        // Add feature facets
        address facet = facetHelper.getDeployedAddress("SpaceOwner");
        addFacet(
            DeploySpaceOwnerFacet.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeploySpaceOwnerFacet.makeInitData("Space Owner", "OWNER")
        );

        facet = facetHelper.getDeployedAddress("EIP712Facet");
        addFacet(
            DeployEIP712Facet.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployEIP712Facet.makeInitData("Space Owner", "1")
        );

        facet = facetHelper.getDeployedAddress("GuardianFacet");
        addFacet(
            DeployGuardianFacet.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployGuardianFacet.makeInitData(7 days)
        );

        facet = facetHelper.getDeployedAddress("MetadataFacet");
        addFacet(
            DeployMetadata.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployMetadata.makeInitData(bytes32("Space Owner"), "")
        );

        return
            Diamond.InitParams({
                baseFacets: baseFacets(),
                init: multiInit,
                initData: abi.encodeCall(MultiInit.multiInit, (_initAddresses, _initDatas))
            });
    }

    function diamondInitParamsFromFacets(address deployer, string[] memory facets) public {
        // Queue up all requested facets for batch deployment
        for (uint256 i; i < facets.length; ++i) {
            facetHelper.add(facets[i]);
        }

        // Deploy all requested facets in a single batch transaction
        facetHelper.deployBatch(deployer);

        // Add the requested facets
        for (uint256 i; i < facets.length; ++i) {
            string memory facetName = facets[i];
            address facet = facetHelper.getDeployedAddress(facetName);

            if (facetName.eq("MetadataFacet")) {
                addFacet(
                    DeployMetadata.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployMetadata.makeInitData(bytes32("Space Owner"), "")
                );
            } else if (facetName.eq("SpaceOwner")) {
                addFacet(
                    DeploySpaceOwnerFacet.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeploySpaceOwnerFacet.makeInitData("Space Owner", "OWNER")
                );
            } else if (facetName.eq("EIP712Facet")) {
                addFacet(
                    DeployEIP712Facet.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployEIP712Facet.makeInitData("Space Owner", "1")
                );
            } else if (facetName.eq("GuardianFacet")) {
                addFacet(
                    DeployGuardianFacet.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployGuardianFacet.makeInitData(7 days)
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
