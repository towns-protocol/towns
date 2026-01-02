// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IDiamondInitHelper} from "./IDiamondInitHelper.sol";

// libraries
import {DeployDiamondCut} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.sol";
import {DeployDiamondLoupe} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.sol";
import {DeployIntrospection} from "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.sol";
import {DeployOwnable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployOwnable.sol";
import {DeployMetadata} from "../facets/DeployMetadata.s.sol";
import {DeployL2RegistryFacet} from "../facets/DeployL2RegistryFacet.s.sol";
import {DeployAddrResolverFacet} from "../facets/DeployAddrResolverFacet.s.sol";
import {DeployTextResolverFacet} from "../facets/DeployTextResolverFacet.s.sol";
import {DeployExtendedResolverFacet} from "../facets/DeployExtendedResolverFacet.s.sol";
import {DeployContentHashResolverFacet} from "../facets/DeployContentHashResolverFacet.s.sol";
import {LibString} from "solady/utils/LibString.sol";

// contracts
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DiamondHelper} from "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";

// deployers
import {DeployFacet} from "../../common/DeployFacet.s.sol";
import {Deployer} from "../../common/Deployer.s.sol";

contract DeployL2Resolver is IDiamondInitHelper, DiamondHelper, Deployer {
    using LibString for string;

    DeployFacet private facetHelper = new DeployFacet();

    string private DOMAIN = "towns.eth";

    bytes32 internal constant METADATA_NAME = bytes32("L2Resolver");

    function versionName() public pure override returns (string memory) {
        return "l2Resolver";
    }

    function setDomain(string memory domain) external {
        DOMAIN = domain;
    }

    function addImmutableCuts(address deployer) internal {
        // Queue up all core facets for batch deployment
        facetHelper.add("DiamondCutFacet");
        facetHelper.add("DiamondLoupeFacet");
        facetHelper.add("IntrospectionFacet");
        facetHelper.add("OwnableFacet");

        // Get predicted addresses and add facets
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
    }

    function diamondInitParams(address deployer) public returns (Diamond.InitParams memory) {
        // Queue up feature facets for batch deployment
        facetHelper.add("MultiInit");
        facetHelper.add("MetadataFacet");
        facetHelper.add("L2RegistryFacet");
        facetHelper.add("AddrResolverFacet");
        facetHelper.add("TextResolverFacet");
        facetHelper.add("ExtendedResolverFacet");
        facetHelper.add("ContentHashResolverFacet");

        // Deploy the batch of facets
        facetHelper.deployBatch(deployer);

        // Add MetadataFacet
        address facet = facetHelper.getDeployedAddress("MetadataFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployMetadata.selectors()),
            facet,
            DeployMetadata.makeInitData(METADATA_NAME, "")
        );

        // Add L2RegistryFacet
        facet = facetHelper.getDeployedAddress("L2RegistryFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployL2RegistryFacet.selectors()),
            facet,
            DeployL2RegistryFacet.makeInitData(DOMAIN, deployer)
        );

        // Add AddrResolverFacet
        facet = facetHelper.getDeployedAddress("AddrResolverFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployAddrResolverFacet.selectors()),
            facet,
            DeployAddrResolverFacet.makeInitData()
        );

        // Add TextResolverFacet
        facet = facetHelper.getDeployedAddress("TextResolverFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployTextResolverFacet.selectors()),
            facet,
            DeployTextResolverFacet.makeInitData()
        );

        // Add ExtendedResolverFacet
        facet = facetHelper.getDeployedAddress("ExtendedResolverFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployExtendedResolverFacet.selectors()),
            facet,
            DeployExtendedResolverFacet.makeInitData()
        );

        // Add ContentHashResolverFacet
        facet = facetHelper.getDeployedAddress("ContentHashResolverFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployContentHashResolverFacet.selectors()),
            facet,
            DeployContentHashResolverFacet.makeInitData()
        );

        address multiInit = facetHelper.getDeployedAddress("MultiInit");

        return
            Diamond.InitParams({
                baseFacets: baseFacets(),
                init: multiInit,
                initData: abi.encodeCall(MultiInit.multiInit, (_initAddresses, _initDatas))
            });
    }

    function diamondInitHelper(
        address deployer,
        string[] memory facetNames
    ) external override returns (FacetCut[] memory) {
        for (uint256 i; i < facetNames.length; ++i) {
            facetHelper.add(facetNames[i]);
        }

        facetHelper.deployBatch(deployer);

        for (uint256 i; i < facetNames.length; ++i) {
            string memory facetName = facetNames[i];
            address facet = facetHelper.getDeployedAddress(facetName);

            if (facetName.eq("L2RegistryFacet")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployL2RegistryFacet.selectors()));
            } else if (facetName.eq("AddrResolverFacet")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployAddrResolverFacet.selectors()));
            } else if (facetName.eq("TextResolverFacet")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployTextResolverFacet.selectors()));
            } else if (facetName.eq("ExtendedResolverFacet")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployExtendedResolverFacet.selectors()));
            } else if (facetName.eq("ContentHashResolverFacet")) {
                addCut(
                    makeCut(facet, FacetCutAction.Add, DeployContentHashResolverFacet.selectors())
                );
            }
        }

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
