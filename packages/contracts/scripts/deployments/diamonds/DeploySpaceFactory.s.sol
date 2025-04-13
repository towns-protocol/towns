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
import {DeployMetadata} from "scripts/deployments/facets/DeployMetadata.s.sol";
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
    DeployFacet private facetHelper = new DeployFacet();
    DeployMetadata metadataHelper = new DeployMetadata();
    DeployArchitect architectHelper = new DeployArchitect();
    DeployCreateSpace createSpaceHelper = new DeployCreateSpace();
    DeployPricingModules pricingModulesHelper = new DeployPricingModules();
    DeployImplementationRegistry registryHelper = new DeployImplementationRegistry();
    DeployWalletLink walletLinkHelper = new DeployWalletLink();
    DeployProxyManager proxyManagerHelper = new DeployProxyManager();
    DeployPlatformRequirements platformReqsHelper = new DeployPlatformRequirements();
    DeployMockLegacyArchitect deployMockLegacyArchitect = new DeployMockLegacyArchitect();
    DeployPartnerRegistry partnerRegistryHelper = new DeployPartnerRegistry();
    DeployFeatureManager featureManagerHelper = new DeployFeatureManager();
    // dependencies
    DeploySpace deploySpace = new DeploySpace();
    DeploySpaceOwner deploySpaceOwner = new DeploySpaceOwner();
    DeployTieredLogPricingV2 deployTieredLogPricingV2 = new DeployTieredLogPricingV2();
    DeployTieredLogPricingV3 deployTieredLogPricingV3 = new DeployTieredLogPricingV3();
    DeploySLCEIP6565 deployVerifierLib = new DeploySLCEIP6565();
    DeploySpaceFactoryInit deploySpaceFactoryInit = new DeploySpaceFactoryInit();

    // helpers
    address multiInit;

    // diamond addresses
    address ownable;
    address diamondCut;
    address diamondLoupe;
    address introspection;
    address metadata;

    // space addresses
    address architect;
    address create;
    address legacyArchitect;
    address proxyManager;
    address pausable;
    address platformReqs;
    address pricingModulesFacet;
    address registry;
    address walletLink;
    address eip712;
    address partnerRegistry;
    address featureManager;
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
    address[] pricingModules;

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
        featureManager = featureManagerHelper.deploy(deployer);
        // pricing modules
        pricingModules.push(tieredLogPricingV2);
        pricingModules.push(tieredLogPricingV3);
        pricingModules.push(fixedPricing);

        multiInit = facetHelper.deploy("MultiInit", deployer);
        diamondCut = facetHelper.deploy("DiamondCutFacet", deployer);
        diamondLoupe = facetHelper.deploy("DiamondLoupeFacet", deployer);
        introspection = facetHelper.deploy("IntrospectionFacet", deployer);
        ownable = facetHelper.deploy("OwnableFacet", deployer);
        sclEip6565 = deployVerifierLib.deploy(deployer);

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
        metadata = metadataHelper.deploy(deployer);
        architect = architectHelper.deploy(deployer);
        create = createSpaceHelper.deploy(deployer);
        registry = registryHelper.deploy(deployer);
        walletLink = walletLinkHelper.deploy(deployer);
        proxyManager = proxyManagerHelper.deploy(deployer);
        pausable = facetHelper.deploy("PausableFacet", deployer);
        platformReqs = platformReqsHelper.deploy(deployer);
        eip712 = facetHelper.deploy("EIP712Facet", deployer);
        pricingModulesFacet = pricingModulesHelper.deploy(deployer);
        partnerRegistry = partnerRegistryHelper.deploy(deployer);

        spaceProxyInitializer = facetHelper.deploy("SpaceProxyInitializer", deployer);
        spaceFactoryInit = deploySpaceFactoryInit.deploy(deployer);
        spaceFactoryInitData = deploySpaceFactoryInit.makeInitData(spaceProxyInitializer);

        if (isAnvil()) {
            legacyArchitect = deployMockLegacyArchitect.deploy(deployer);
            mockDelegationRegistry = facetHelper.deploy("MockDelegationRegistry", deployer);
        } else {
            mockDelegationRegistry = 0x00000000000000447e69651d841bD8D104Bed493;
        }

        addFacet(
            metadataHelper.makeCut(metadata, IDiamond.FacetCutAction.Add),
            metadata,
            metadataHelper.makeInitData(bytes32("SpaceFactory"), "")
        );
        addFacet(
            architectHelper.makeCut(architect, IDiamond.FacetCutAction.Add),
            architect,
            architectHelper.makeInitData(
                spaceOwner,
                userEntitlement,
                ruleEntitlement,
                legacyRuleEntitlement
            )
        );
        addFacet(
            createSpaceHelper.makeCut(create, IDiamond.FacetCutAction.Add),
            create,
            createSpaceHelper.makeInitData("")
        );
        if (isAnvil()) {
            addFacet(
                deployMockLegacyArchitect.makeCut(legacyArchitect, IDiamond.FacetCutAction.Add),
                legacyArchitect,
                deployMockLegacyArchitect.makeInitData("")
            );
        }
        addFacet(
            proxyManagerHelper.makeCut(proxyManager, IDiamond.FacetCutAction.Add),
            proxyManager,
            proxyManagerHelper.makeInitData(spaceImpl)
        );
        addFacet(
            DeployPausable.makeCut(pausable, IDiamond.FacetCutAction.Add),
            pausable,
            DeployPausable.makeInitData()
        );
        addFacet(
            platformReqsHelper.makeCut(platformReqs, IDiamond.FacetCutAction.Add),
            platformReqs,
            platformReqsHelper.makeInitData(
                deployer, // feeRecipient
                500, // membershipBps 5%
                0.001 ether, // membershipFee
                1000, // membershipFreeAllocation
                365 days, // membershipDuration
                0.005 ether // membershipMinPrice
            )
        );
        addFacet(
            pricingModulesHelper.makeCut(pricingModulesFacet, IDiamond.FacetCutAction.Add),
            pricingModulesFacet,
            pricingModulesHelper.makeInitData(pricingModules)
        );
        addFacet(
            registryHelper.makeCut(registry, IDiamond.FacetCutAction.Add),
            registry,
            registryHelper.makeInitData("")
        );
        addFacet(
            walletLinkHelper.makeCut(walletLink, IDiamond.FacetCutAction.Add),
            walletLink,
            walletLinkHelper.makeInitData(mockDelegationRegistry, sclEip6565)
        );
        addFacet(
            DeployEIP712Facet.makeCut(eip712, IDiamond.FacetCutAction.Add),
            eip712,
            DeployEIP712Facet.makeInitData("SpaceFactory", "1")
        );
        addFacet(
            partnerRegistryHelper.makeCut(partnerRegistry, IDiamond.FacetCutAction.Add),
            partnerRegistry,
            partnerRegistryHelper.makeInitData("")
        );
        addFacet(
            featureManagerHelper.makeCut(featureManager, IDiamond.FacetCutAction.Add),
            featureManager,
            featureManagerHelper.makeInitData("")
        );

        addInit(spaceFactoryInit, spaceFactoryInitData);

        return
            Diamond.InitParams({
                baseFacets: baseFacets(),
                init: multiInit,
                initData: abi.encodeWithSelector(
                    MultiInit.multiInit.selector,
                    _initAddresses,
                    _initDatas
                )
            });
    }

    function diamondInitParamsFromFacets(address deployer, string[] memory facets) public {
        for (uint256 i = 0; i < facets.length; i++) {
            bytes32 facetNameHash = keccak256(abi.encodePacked(facets[i]));

            if (facetNameHash == keccak256(abi.encodePacked("MetadataFacet"))) {
                metadata = metadataHelper.deploy(deployer);
                addFacet(
                    metadataHelper.makeCut(metadata, IDiamond.FacetCutAction.Add),
                    metadata,
                    metadataHelper.makeInitData(bytes32("SpaceFactory"), "")
                );
            } else if (facetNameHash == keccak256(abi.encodePacked("Architect"))) {
                architect = architectHelper.deploy(deployer);
                addFacet(
                    architectHelper.makeCut(architect, IDiamond.FacetCutAction.Add),
                    architect,
                    architectHelper.makeInitData(
                        spaceOwner,
                        userEntitlement,
                        ruleEntitlement,
                        legacyRuleEntitlement
                    )
                );
            } else if (facetNameHash == keccak256(abi.encodePacked("MockLegacyArchitect"))) {
                legacyArchitect = deployMockLegacyArchitect.deploy(deployer);
                addFacet(
                    deployMockLegacyArchitect.makeCut(legacyArchitect, IDiamond.FacetCutAction.Add),
                    legacyArchitect,
                    deployMockLegacyArchitect.makeInitData("")
                );
            } else if (facetNameHash == keccak256(abi.encodePacked("ProxyManager"))) {
                proxyManager = proxyManagerHelper.deploy(deployer);
                addFacet(
                    proxyManagerHelper.makeCut(proxyManager, IDiamond.FacetCutAction.Add),
                    proxyManager,
                    proxyManagerHelper.makeInitData(spaceImpl)
                );
            } else if (facetNameHash == keccak256(abi.encodePacked("PausableFacet"))) {
                pausable = facetHelper.deploy("PausableFacet", deployer);
                addFacet(
                    DeployPausable.makeCut(pausable, IDiamond.FacetCutAction.Add),
                    pausable,
                    DeployPausable.makeInitData()
                );
            } else if (facetNameHash == keccak256(abi.encodePacked("PlatformRequirementsFacet"))) {
                platformReqs = platformReqsHelper.deploy(deployer);
                addFacet(
                    platformReqsHelper.makeCut(platformReqs, IDiamond.FacetCutAction.Add),
                    platformReqs,
                    platformReqsHelper.makeInitData(
                        deployer, // feeRecipient
                        500, // membershipBps 5%
                        0.005 ether, // membershipFee
                        1000, // membershipFreeAllocation
                        365 days, // membershipDuration
                        0.001 ether // membershipMinPrice
                    )
                );
            } else if (facetNameHash == keccak256(abi.encodePacked("PricingModulesFacet"))) {
                pricingModulesFacet = pricingModulesHelper.deploy(deployer);
                addFacet(
                    pricingModulesHelper.makeCut(pricingModulesFacet, IDiamond.FacetCutAction.Add),
                    pricingModulesFacet,
                    pricingModulesHelper.makeInitData(pricingModules)
                );
            } else if (facetNameHash == keccak256(abi.encodePacked("ImplementationRegistry"))) {
                registry = registryHelper.deploy(deployer);
                addFacet(
                    registryHelper.makeCut(registry, IDiamond.FacetCutAction.Add),
                    registry,
                    registryHelper.makeInitData("")
                );
            } else if (facetNameHash == keccak256(abi.encodePacked("WalletLink"))) {
                walletLink = walletLinkHelper.deploy(deployer);
                sclEip6565 = deployVerifierLib.deploy(deployer);
                mockDelegationRegistry = 0x00000000000000447e69651d841bD8D104Bed493;
                addFacet(
                    walletLinkHelper.makeCut(walletLink, IDiamond.FacetCutAction.Add),
                    walletLink,
                    walletLinkHelper.makeInitData(mockDelegationRegistry, sclEip6565)
                );
            } else if (facetNameHash == keccak256(abi.encodePacked("EIP712Facet"))) {
                eip712 = facetHelper.deploy("EIP712Facet", deployer);
                addFacet(
                    DeployEIP712Facet.makeCut(eip712, IDiamond.FacetCutAction.Add),
                    eip712,
                    DeployEIP712Facet.makeInitData("SpaceFactory", "1")
                );
            } else if (facetNameHash == keccak256(abi.encodePacked("PartnerRegistry"))) {
                partnerRegistry = partnerRegistryHelper.deploy(deployer);
                addFacet(
                    partnerRegistryHelper.makeCut(partnerRegistry, IDiamond.FacetCutAction.Add),
                    partnerRegistry,
                    partnerRegistryHelper.makeInitData("")
                );
            } else if (facetNameHash == keccak256(abi.encodePacked("CreateSpaceFacet"))) {
                create = createSpaceHelper.deploy(deployer);
                addFacet(
                    createSpaceHelper.makeCut(create, IDiamond.FacetCutAction.Add),
                    create,
                    createSpaceHelper.makeInitData("")
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
