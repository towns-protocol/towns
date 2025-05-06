// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
import {IDiamondInitHelper} from "./IDiamondInitHelper.sol";

// libraries
import {DeployDiamondCut} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.sol";
import {DeployDiamondLoupe} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.sol";
import {DeployEIP712Facet} from "@towns-protocol/diamond/scripts/deployments/facets/DeployEIP712Facet.sol";
import {DeployIntrospection} from "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.sol";
import {DeployOwnable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployOwnable.sol";
import {DeployPausable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployPausable.sol";
import {DeployProxyManager} from "@towns-protocol/diamond/scripts/deployments/utils/DeployProxyManager.sol";
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {DeployFeatureManager} from "../facets/DeployFeatureManager.s.sol";
import {DeployMetadata} from "../facets/DeployMetadata.s.sol";
import {DeployPricingModules} from "../facets/DeployPricingModules.s.sol";
import {DeploySpaceFactoryInit} from "../facets/DeploySpaceFactoryInit.s.sol";
import {DeployArchitect} from "../facets/DeployArchitect.s.sol";
import {DeployCreateSpace} from "../facets/DeployCreateSpace.s.sol";
import {DeployImplementationRegistry} from "../facets/DeployImplementationRegistry.s.sol";
import {DeployMockLegacyArchitect} from "../facets/DeployMockLegacyArchitect.s.sol";
import {DeployPartnerRegistry} from "../facets/DeployPartnerRegistry.s.sol";
import {DeployPlatformRequirements} from "../facets/DeployPlatformRequirements.s.sol";
import {DeployWalletLink} from "../facets/DeployWalletLink.s.sol";
import {LibString} from "solady/utils/LibString.sol";

// contracts
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DiamondHelper} from "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";

// deployers
import {DeployFacet} from "../../common/DeployFacet.s.sol";
import {Deployer} from "../../common/Deployer.s.sol";
import {DeploySpace} from "scripts/deployments/diamonds/DeploySpace.s.sol";
import {DeploySpaceOwner} from "scripts/deployments/diamonds/DeploySpaceOwner.s.sol";
import {DeployTieredLogPricingV2} from "scripts/deployments/utils/DeployTieredLogPricingV2.s.sol";
import {DeployTieredLogPricingV3} from "scripts/deployments/utils/DeployTieredLogPricingV3.s.sol";

contract DeploySpaceFactory is IDiamondInitHelper, DiamondHelper, Deployer {
    using LibString for string;

    DeployFacet private facetHelper = new DeployFacet();

    // dependencies
    DeploySpace private deploySpace = new DeploySpace();
    DeploySpaceOwner private deploySpaceOwner = new DeploySpaceOwner();
    DeployTieredLogPricingV2 private deployTieredLogPricingV2 = new DeployTieredLogPricingV2();
    DeployTieredLogPricingV3 private deployTieredLogPricingV3 = new DeployTieredLogPricingV3();

    // helpers
    address private multiInit;
    address[] private pricingModules;

    // external contracts
    address public spaceImpl;
    address public userEntitlement;
    address public legacyRuleEntitlement;
    address public ruleEntitlement;
    address public spaceOwner;
    address public tieredLogPricingV2;
    address public tieredLogPricingV3;
    address public fixedPricing;
    address public sclEip6565;
    address public mockDelegationRegistry;

    // init
    address public spaceFactoryInit;
    bytes public spaceFactoryInitData;

    function versionName() public pure override returns (string memory) {
        return "spaceFactory";
    }

    function addImmutableCuts(address deployer) internal {
        spaceImpl = deploySpace.deploy(deployer);
        spaceOwner = deploySpaceOwner.deploy(deployer);

        // entitlement modules
        userEntitlement = facetHelper.deploy("UserEntitlement", deployer);
        ruleEntitlement = facetHelper.deploy("RuleEntitlementV2", deployer);
        legacyRuleEntitlement = facetHelper.deploy("RuleEntitlement", deployer);

        // pricing modules
        tieredLogPricingV2 = deployTieredLogPricingV2.deploy(deployer);
        tieredLogPricingV3 = deployTieredLogPricingV3.deploy(deployer);
        fixedPricing = facetHelper.deploy("FixedPricing", deployer);
        // pricing modules
        pricingModules.push(tieredLogPricingV2);
        pricingModules.push(tieredLogPricingV3);
        pricingModules.push(fixedPricing);

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
        if (isAnvil()) {
            mockDelegationRegistry = facetHelper.deploy("MockDelegationRegistry", deployer);
        } else {
            mockDelegationRegistry = 0x00000000000000447e69651d841bD8D104Bed493;
        }

        address facet = facetHelper.deploy("MetadataFacet", deployer);
        addFacet(
            DeployMetadata.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployMetadata.makeInitData(bytes32("SpaceFactory"), "")
        );

        facet = facetHelper.deploy("Architect", deployer);
        addFacet(
            DeployArchitect.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployArchitect.makeInitData(
                spaceOwner,
                userEntitlement,
                ruleEntitlement,
                legacyRuleEntitlement
            )
        );

        facet = facetHelper.deploy("CreateSpaceFacet", deployer);
        addFacet(
            DeployCreateSpace.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployCreateSpace.makeInitData()
        );

        if (isAnvil()) {
            facet = facetHelper.deploy("MockLegacyArchitect", deployer);
            addFacet(
                DeployMockLegacyArchitect.makeCut(facet, IDiamond.FacetCutAction.Add),
                facet,
                DeployMockLegacyArchitect.makeInitData()
            );
        }

        facet = facetHelper.deploy("ProxyManager", deployer);
        addFacet(
            DeployProxyManager.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployProxyManager.makeInitData(spaceImpl)
        );

        facet = facetHelper.deploy("PausableFacet", deployer);
        addFacet(
            DeployPausable.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployPausable.makeInitData()
        );

        facet = facetHelper.deploy("PlatformRequirementsFacet", deployer);
        addFacet(
            DeployPlatformRequirements.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployPlatformRequirements.makeInitData(
                deployer, // feeRecipient
                500, // membershipBps 5%
                0.001 ether, // membershipFee
                1000, // membershipFreeAllocation
                365 days, // membershipDuration
                0.005 ether // membershipMinPrice
            )
        );

        facet = facetHelper.deploy("PricingModulesFacet", deployer);
        addFacet(
            DeployPricingModules.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployPricingModules.makeInitData(pricingModules)
        );

        facet = facetHelper.deploy("ImplementationRegistryFacet", deployer);
        addFacet(
            DeployImplementationRegistry.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployImplementationRegistry.makeInitData()
        );

        sclEip6565 = LibDeploy.deployCode(
            string.concat(outDir(), "/libSCL_EIP6565.sol/SCL_EIP6565.json"),
            ""
        );
        facet = facetHelper.deploy("WalletLink", deployer);
        addFacet(
            DeployWalletLink.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployWalletLink.makeInitData(sclEip6565)
        );

        facet = facetHelper.deploy("EIP712Facet", deployer);
        addFacet(
            DeployEIP712Facet.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployEIP712Facet.makeInitData("SpaceFactory", "1")
        );

        facet = facetHelper.deploy("PartnerRegistry", deployer);
        addFacet(
            DeployPartnerRegistry.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployPartnerRegistry.makeInitData()
        );

        facet = facetHelper.deploy("FeatureManagerFacet", deployer);
        addFacet(
            DeployFeatureManager.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployFeatureManager.makeInitData()
        );

        address spaceProxyInitializer = facetHelper.deploy("SpaceProxyInitializer", deployer);
        spaceFactoryInit = facetHelper.deploy("SpaceFactoryInit", deployer);
        spaceFactoryInitData = DeploySpaceFactoryInit.makeInitData(spaceProxyInitializer);
        addInit(spaceFactoryInit, spaceFactoryInitData);

        return
            Diamond.InitParams({
                baseFacets: baseFacets(),
                init: multiInit,
                initData: abi.encodeCall(MultiInit.multiInit, (_initAddresses, _initDatas))
            });
    }

    function diamondInitParamsFromFacets(address deployer, string[] memory facets) public {
        address facet;
        for (uint256 i; i < facets.length; ++i) {
            string memory facetName = facets[i];

            if (facetName.eq("MetadataFacet")) {
                facet = facetHelper.deploy("MetadataFacet", deployer);
                addFacet(
                    DeployMetadata.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployMetadata.makeInitData(bytes32("SpaceFactory"), "")
                );
            } else if (facetName.eq("Architect")) {
                facet = facetHelper.deploy("Architect", deployer);
                addFacet(
                    DeployArchitect.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployArchitect.makeInitData(
                        spaceOwner,
                        userEntitlement,
                        ruleEntitlement,
                        legacyRuleEntitlement
                    )
                );
            } else if (facetName.eq("MockLegacyArchitect")) {
                facet = facetHelper.deploy("MockLegacyArchitect", deployer);
                addFacet(
                    DeployMockLegacyArchitect.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployMockLegacyArchitect.makeInitData()
                );
            } else if (facetName.eq("ProxyManager")) {
                facet = facetHelper.deploy("ProxyManager", deployer);
                addFacet(
                    DeployProxyManager.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployProxyManager.makeInitData(spaceImpl)
                );
            } else if (facetName.eq("PausableFacet")) {
                facet = facetHelper.deploy("PausableFacet", deployer);
                addFacet(
                    DeployPausable.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployPausable.makeInitData()
                );
            } else if (facetName.eq("PlatformRequirementsFacet")) {
                facet = facetHelper.deploy("PlatformRequirementsFacet", deployer);
                addFacet(
                    DeployPlatformRequirements.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployPlatformRequirements.makeInitData(
                        deployer, // feeRecipient
                        500, // membershipBps 5%
                        0.005 ether, // membershipFee
                        1000, // membershipFreeAllocation
                        365 days, // membershipDuration
                        0.001 ether // membershipMinPrice
                    )
                );
            } else if (facetName.eq("PricingModulesFacet")) {
                facet = facetHelper.deploy("PricingModulesFacet", deployer);
                addFacet(
                    DeployPricingModules.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployPricingModules.makeInitData(pricingModules)
                );
            } else if (facetName.eq("ImplementationRegistryFacet")) {
                facet = facetHelper.deploy("ImplementationRegistryFacet", deployer);
                addFacet(
                    DeployImplementationRegistry.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployImplementationRegistry.makeInitData()
                );
            } else if (facetName.eq("WalletLink")) {
                sclEip6565 = LibDeploy.deployCode(
                    string.concat(outDir(), "/libSCL_EIP6565.sol/SCL_EIP6565.json"),
                    ""
                );
                facet = facetHelper.deploy("WalletLink", deployer);
                addFacet(
                    DeployWalletLink.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployWalletLink.makeInitData(sclEip6565)
                );
            } else if (facetName.eq("EIP712Facet")) {
                facet = facetHelper.deploy("EIP712Facet", deployer);
                addFacet(
                    DeployEIP712Facet.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployEIP712Facet.makeInitData("SpaceFactory", "1")
                );
            } else if (facetName.eq("PartnerRegistry")) {
                facet = facetHelper.deploy("PartnerRegistry", deployer);
                addFacet(
                    DeployPartnerRegistry.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployPartnerRegistry.makeInitData()
                );
            } else if (facetName.eq("CreateSpaceFacet")) {
                facet = facetHelper.deploy("CreateSpaceFacet", deployer);
                addFacet(
                    DeployCreateSpace.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployCreateSpace.makeInitData()
                );
            } else if (facetName.eq("FeatureManager")) {
                facet = facetHelper.deploy("FeatureManagerFacet", deployer);
                addFacet(
                    DeployFeatureManager.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployFeatureManager.makeInitData()
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
