// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
import {IDiamondInitHelper} from "./IDiamondInitHelper.sol";

// libraries
import {DeployDiamondCut} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployEIP712Facet} from "@towns-protocol/diamond/scripts/deployments/facets/DeployEIP712Facet.s.sol";
import {DeployIntrospection} from "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployOwnable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployOwnable.s.sol";
import {DeployPausable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployPausable.s.sol";
import {DeployMetadata} from "../facets/DeployMetadata.s.sol";
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
import {DeployArchitect} from "scripts/deployments/facets/DeployArchitect.s.sol";
import {DeployCreateSpace} from "scripts/deployments/facets/DeployCreateSpace.s.sol";
import {DeployImplementationRegistry} from "scripts/deployments/facets/DeployImplementationRegistry.s.sol";
import {DeployMockLegacyArchitect} from "scripts/deployments/facets/DeployMockLegacyArchitect.s.sol";
import {DeployPartnerRegistry} from "scripts/deployments/facets/DeployPartnerRegistry.s.sol";
import {DeployPlatformRequirements} from "scripts/deployments/facets/DeployPlatformRequirements.s.sol";
import {DeployPricingModules} from "scripts/deployments/facets/DeployPricingModules.s.sol";
import {DeployProxyManager} from "scripts/deployments/facets/DeployProxyManager.s.sol";
import {DeploySpaceFactoryInit} from "scripts/deployments/facets/DeploySpaceFactoryInit.s.sol";
import {DeployWalletLink} from "scripts/deployments/facets/DeployWalletLink.s.sol";
import {DeploySLCEIP6565} from "scripts/deployments/utils/DeploySLCEIP6565.s.sol";
import {DeployTieredLogPricingV2} from "scripts/deployments/utils/DeployTieredLogPricingV2.s.sol";
import {DeployTieredLogPricingV3} from "scripts/deployments/utils/DeployTieredLogPricingV3.s.sol";
import {DeployFeatureManager} from "scripts/deployments/facets/DeployFeatureManager.s.sol";

contract DeploySpaceFactory is IDiamondInitHelper, DiamondHelper, Deployer {
    using LibString for string;

    DeployFacet private facetHelper = new DeployFacet();
    DeployArchitect private architectHelper = new DeployArchitect();
    DeployCreateSpace private createSpaceHelper = new DeployCreateSpace();
    DeployPricingModules private pricingModulesHelper = new DeployPricingModules();
    DeployImplementationRegistry private registryHelper = new DeployImplementationRegistry();
    DeployWalletLink private walletLinkHelper = new DeployWalletLink();
    DeployProxyManager private proxyManagerHelper = new DeployProxyManager();
    DeployPlatformRequirements private platformReqsHelper = new DeployPlatformRequirements();
    DeployMockLegacyArchitect private deployMockLegacyArchitect = new DeployMockLegacyArchitect();
    DeployPartnerRegistry private partnerRegistryHelper = new DeployPartnerRegistry();
    DeployFeatureManager private featureManagerHelper = new DeployFeatureManager();
    // dependencies
    DeploySpace private deploySpace = new DeploySpace();
    DeploySpaceOwner private deploySpaceOwner = new DeploySpaceOwner();
    DeployTieredLogPricingV2 private deployTieredLogPricingV2 = new DeployTieredLogPricingV2();
    DeployTieredLogPricingV3 private deployTieredLogPricingV3 = new DeployTieredLogPricingV3();
    DeploySLCEIP6565 private deployVerifierLib = new DeploySLCEIP6565();
    DeploySpaceFactoryInit private deploySpaceFactoryInit = new DeploySpaceFactoryInit();

    // helpers
    address private multiInit;
    address[] private pricingModules;

    // external contracts
    address public spaceImpl;
    address public userEntitlement;
    address public legacyRuleEntitlement;
    address public ruleEntitlement;
    address public spaceOwner;
    address public spaceProxyInitializer;
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

        spaceProxyInitializer = facetHelper.deploy("SpaceProxyInitializer", deployer);
        spaceFactoryInit = deploySpaceFactoryInit.deploy(deployer);
        spaceFactoryInitData = deploySpaceFactoryInit.makeInitData(spaceProxyInitializer);

        address facet = facetHelper.deploy("MetadataFacet", deployer);
        addFacet(
            DeployMetadata.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployMetadata.makeInitData(bytes32("SpaceFactory"), "")
        );

        facet = architectHelper.deploy(deployer);
        addFacet(
            architectHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            architectHelper.makeInitData(
                spaceOwner,
                userEntitlement,
                ruleEntitlement,
                legacyRuleEntitlement
            )
        );

        facet = createSpaceHelper.deploy(deployer);
        addFacet(
            createSpaceHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            createSpaceHelper.makeInitData("")
        );

        if (isAnvil()) {
            facet = deployMockLegacyArchitect.deploy(deployer);
            addFacet(
                deployMockLegacyArchitect.makeCut(facet, IDiamond.FacetCutAction.Add),
                facet,
                deployMockLegacyArchitect.makeInitData("")
            );
        }

        facet = proxyManagerHelper.deploy(deployer);
        addFacet(
            proxyManagerHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            proxyManagerHelper.makeInitData(spaceImpl)
        );

        facet = facetHelper.deploy("PausableFacet", deployer);
        addFacet(
            DeployPausable.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployPausable.makeInitData()
        );

        facet = platformReqsHelper.deploy(deployer);
        addFacet(
            platformReqsHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            platformReqsHelper.makeInitData(
                deployer, // feeRecipient
                500, // membershipBps 5%
                0.001 ether, // membershipFee
                1000, // membershipFreeAllocation
                365 days, // membershipDuration
                0.005 ether // membershipMinPrice
            )
        );

        facet = pricingModulesHelper.deploy(deployer);
        addFacet(
            pricingModulesHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            pricingModulesHelper.makeInitData(pricingModules)
        );

        facet = registryHelper.deploy(deployer);
        addFacet(
            registryHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            registryHelper.makeInitData("")
        );

        facet = walletLinkHelper.deploy(deployer);
        sclEip6565 = deployVerifierLib.deploy(deployer);
        addFacet(
            walletLinkHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            walletLinkHelper.makeInitData(sclEip6565)
        );

        facet = facetHelper.deploy("EIP712Facet", deployer);
        addFacet(
            DeployEIP712Facet.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployEIP712Facet.makeInitData("SpaceFactory", "1")
        );

        facet = partnerRegistryHelper.deploy(deployer);
        addFacet(
            partnerRegistryHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            partnerRegistryHelper.makeInitData("")
        );

        facet = featureManagerHelper.deploy(deployer);
        addFacet(
            featureManagerHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            featureManagerHelper.makeInitData("")
        );

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
                facet = architectHelper.deploy(deployer);
                addFacet(
                    architectHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    architectHelper.makeInitData(
                        spaceOwner,
                        userEntitlement,
                        ruleEntitlement,
                        legacyRuleEntitlement
                    )
                );
            } else if (facetName.eq("MockLegacyArchitect")) {
                facet = deployMockLegacyArchitect.deploy(deployer);
                addFacet(
                    deployMockLegacyArchitect.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    deployMockLegacyArchitect.makeInitData("")
                );
            } else if (facetName.eq("ProxyManager")) {
                facet = proxyManagerHelper.deploy(deployer);
                addFacet(
                    proxyManagerHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    proxyManagerHelper.makeInitData(spaceImpl)
                );
            } else if (facetName.eq("PausableFacet")) {
                facet = facetHelper.deploy("PausableFacet", deployer);
                addFacet(
                    DeployPausable.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployPausable.makeInitData()
                );
            } else if (facetName.eq("PlatformRequirementsFacet")) {
                facet = platformReqsHelper.deploy(deployer);
                addFacet(
                    platformReqsHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    platformReqsHelper.makeInitData(
                        deployer, // feeRecipient
                        500, // membershipBps 5%
                        0.005 ether, // membershipFee
                        1000, // membershipFreeAllocation
                        365 days, // membershipDuration
                        0.001 ether // membershipMinPrice
                    )
                );
            } else if (facetName.eq("PricingModulesFacet")) {
                facet = pricingModulesHelper.deploy(deployer);
                addFacet(
                    pricingModulesHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    pricingModulesHelper.makeInitData(pricingModules)
                );
            } else if (facetName.eq("ImplementationRegistry")) {
                facet = registryHelper.deploy(deployer);
                addFacet(
                    registryHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    registryHelper.makeInitData("")
                );
            } else if (facetName.eq("WalletLink")) {
                facet = walletLinkHelper.deploy(deployer);
                sclEip6565 = deployVerifierLib.deploy(deployer);
                addFacet(
                    walletLinkHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    walletLinkHelper.makeInitData(sclEip6565)
                );
            } else if (facetName.eq("EIP712Facet")) {
                facet = facetHelper.deploy("EIP712Facet", deployer);
                addFacet(
                    DeployEIP712Facet.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployEIP712Facet.makeInitData("SpaceFactory", "1")
                );
            } else if (facetName.eq("PartnerRegistry")) {
                facet = partnerRegistryHelper.deploy(deployer);
                addFacet(
                    partnerRegistryHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    partnerRegistryHelper.makeInitData("")
                );
            } else if (facetName.eq("CreateSpaceFacet")) {
                facet = createSpaceHelper.deploy(deployer);
                addFacet(
                    createSpaceHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    createSpaceHelper.makeInitData("")
                );
            } else if (facetName.eq("FeatureManager")) {
                facet = featureManagerHelper.deploy(deployer);
                addFacet(
                    featureManagerHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    featureManagerHelper.makeInitData("")
                );
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
