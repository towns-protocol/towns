// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// helpers
import {Deployer} from "scripts/common/Deployer.s.sol";
import {DiamondHelper} from "test/diamond/Diamond.t.sol";

// contracts
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {ProxyManager} from "@towns-protocol/diamond/src/proxy/manager/ProxyManager.sol";
import {Architect} from "src/factory/facets/architect/Architect.sol";

// space helpers
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";

// deployments
import {DeploySpace} from "scripts/deployments/diamonds/DeploySpace.s.sol";
import {DeploySpaceOwner} from "scripts/deployments/diamonds/DeploySpaceOwner.s.sol";
import {DeployArchitect} from "scripts/deployments/facets/DeployArchitect.s.sol";
import {DeployCreateSpace} from "scripts/deployments/facets/DeployCreateSpace.s.sol";
import {DeployDiamondCut} from "scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployEIP712Facet} from "scripts/deployments/facets/DeployEIP712Facet.s.sol";
import {DeployImplementationRegistry} from "scripts/deployments/facets/DeployImplementationRegistry.s.sol";
import {DeployIntrospection} from "scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployMetadata} from "scripts/deployments/facets/DeployMetadata.s.sol";
import {DeployMockLegacyArchitect} from "scripts/deployments/facets/DeployMockLegacyArchitect.s.sol";
import {DeployOwnable} from "scripts/deployments/facets/DeployOwnable.s.sol";
import {DeployPartnerRegistry} from "scripts/deployments/facets/DeployPartnerRegistry.s.sol";
import {DeployPausable} from "scripts/deployments/facets/DeployPausable.s.sol";
import {DeployPlatformRequirements} from "scripts/deployments/facets/DeployPlatformRequirements.s.sol";
import {DeployPricingModules} from "scripts/deployments/facets/DeployPricingModules.s.sol";
import {DeployProxyManager} from "scripts/deployments/facets/DeployProxyManager.s.sol";
import {DeploySpaceFactoryInit} from "scripts/deployments/facets/DeploySpaceFactoryInit.s.sol";
import {DeployWalletLink} from "scripts/deployments/facets/DeployWalletLink.s.sol";
import {DeployFixedPricing} from "scripts/deployments/utils/DeployFixedPricing.s.sol";
import {DeployMockDelegationRegistry} from "scripts/deployments/utils/DeployMockDelegationRegistry.s.sol";
import {DeployMultiInit} from "scripts/deployments/utils/DeployMultiInit.s.sol";
import {DeployRuleEntitlement} from "scripts/deployments/utils/DeployRuleEntitlement.s.sol";
import {DeployRuleEntitlementV2} from "scripts/deployments/utils/DeployRuleEntitlementV2.s.sol";
import {DeploySLCEIP6565} from "scripts/deployments/utils/DeploySLCEIP6565.s.sol";
import {DeploySpaceProxyInitializer} from "scripts/deployments/utils/DeploySpaceProxyInitializer.s.sol";
import {DeployTieredLogPricingV2} from "scripts/deployments/utils/DeployTieredLogPricingV2.s.sol";
import {DeployTieredLogPricingV3} from "scripts/deployments/utils/DeployTieredLogPricingV3.s.sol";
import {DeployUserEntitlement} from "scripts/deployments/utils/DeployUserEntitlement.s.sol";
import {DeployFeatureManager} from "scripts/deployments/facets/DeployFeatureManager.s.sol";

contract DeploySpaceFactory is DiamondHelper, Deployer {
    // diamond helpers
    DeployOwnable ownableHelper = new DeployOwnable();
    DeployDiamondCut diamondCutHelper = new DeployDiamondCut();
    DeployDiamondLoupe diamondLoupeHelper = new DeployDiamondLoupe();
    DeployIntrospection introspectionHelper = new DeployIntrospection();
    DeployMetadata metadataHelper = new DeployMetadata();

    // facets
    DeployArchitect architectHelper = new DeployArchitect();
    DeployCreateSpace createSpaceHelper = new DeployCreateSpace();
    DeployPricingModules pricingModulesHelper = new DeployPricingModules();
    DeployImplementationRegistry registryHelper = new DeployImplementationRegistry();
    DeployWalletLink walletLinkHelper = new DeployWalletLink();
    DeployProxyManager proxyManagerHelper = new DeployProxyManager();
    DeployPausable pausableHelper = new DeployPausable();
    DeployPlatformRequirements platformReqsHelper = new DeployPlatformRequirements();
    DeployEIP712Facet eip712Helper = new DeployEIP712Facet();
    DeployMockLegacyArchitect deployMockLegacyArchitect = new DeployMockLegacyArchitect();
    DeployPartnerRegistry partnerRegistryHelper = new DeployPartnerRegistry();
    DeployMultiInit deployMultiInit = new DeployMultiInit();
    DeployFeatureManager featureManagerHelper = new DeployFeatureManager();
    // dependencies
    DeploySpace deploySpace = new DeploySpace();
    DeploySpaceOwner deploySpaceOwner = new DeploySpaceOwner();
    DeployUserEntitlement deployUserEntitlement = new DeployUserEntitlement();
    DeployRuleEntitlement deployLegacyRuleEntitlement = new DeployRuleEntitlement();
    DeployRuleEntitlementV2 deployRuleEntitlementV2 = new DeployRuleEntitlementV2();

    DeployTieredLogPricingV2 deployTieredLogPricingV2 = new DeployTieredLogPricingV2();
    DeployTieredLogPricingV3 deployTieredLogPricingV3 = new DeployTieredLogPricingV3();

    DeployFixedPricing deployFixedPricing = new DeployFixedPricing();
    DeploySpaceProxyInitializer deploySpaceProxyInitializer = new DeploySpaceProxyInitializer();

    DeploySLCEIP6565 deployVerifierLib = new DeploySLCEIP6565();

    DeploySpaceFactoryInit deploySpaceFactoryInit = new DeploySpaceFactoryInit();

    DeployMockDelegationRegistry deployMockDelegationRegistry = new DeployMockDelegationRegistry();

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
        userEntitlement = deployUserEntitlement.deploy(deployer);
        ruleEntitlement = deployRuleEntitlementV2.deploy(deployer);
        legacyRuleEntitlement = deployLegacyRuleEntitlement.deploy(deployer);

        // pricing modules
        tieredLogPricingV2 = deployTieredLogPricingV2.deploy(deployer);
        tieredLogPricingV3 = deployTieredLogPricingV3.deploy(deployer);
        fixedPricing = deployFixedPricing.deploy(deployer);
        featureManager = featureManagerHelper.deploy(deployer);
        // pricing modules
        pricingModules.push(tieredLogPricingV2);
        pricingModules.push(tieredLogPricingV3);
        pricingModules.push(fixedPricing);

        multiInit = deployMultiInit.deploy(deployer);

        diamondCut = diamondCutHelper.deploy(deployer);
        diamondLoupe = diamondLoupeHelper.deploy(deployer);
        introspection = introspectionHelper.deploy(deployer);
        ownable = ownableHelper.deploy(deployer);
        sclEip6565 = deployVerifierLib.deploy(deployer);

        addFacet(
            diamondCutHelper.makeCut(diamondCut, IDiamond.FacetCutAction.Add),
            diamondCut,
            diamondCutHelper.makeInitData("")
        );
        addFacet(
            diamondLoupeHelper.makeCut(diamondLoupe, IDiamond.FacetCutAction.Add),
            diamondLoupe,
            diamondLoupeHelper.makeInitData("")
        );
        addFacet(
            introspectionHelper.makeCut(introspection, IDiamond.FacetCutAction.Add),
            introspection,
            introspectionHelper.makeInitData("")
        );
        addFacet(
            ownableHelper.makeCut(ownable, IDiamond.FacetCutAction.Add),
            ownable,
            ownableHelper.makeInitData(deployer)
        );
    }

    function diamondInitParams(address deployer) public returns (Diamond.InitParams memory) {
        metadata = metadataHelper.deploy(deployer);
        architect = architectHelper.deploy(deployer);
        create = createSpaceHelper.deploy(deployer);
        registry = registryHelper.deploy(deployer);
        walletLink = walletLinkHelper.deploy(deployer);
        proxyManager = proxyManagerHelper.deploy(deployer);
        pausable = pausableHelper.deploy(deployer);
        platformReqs = platformReqsHelper.deploy(deployer);
        eip712 = eip712Helper.deploy(deployer);
        pricingModulesFacet = pricingModulesHelper.deploy(deployer);
        partnerRegistry = partnerRegistryHelper.deploy(deployer);

        spaceProxyInitializer = deploySpaceProxyInitializer.deploy(deployer);
        spaceFactoryInit = deploySpaceFactoryInit.deploy(deployer);
        spaceFactoryInitData = deploySpaceFactoryInit.makeInitData(spaceProxyInitializer);

        if (isAnvil()) {
            legacyArchitect = deployMockLegacyArchitect.deploy(deployer);
            mockDelegationRegistry = deployMockDelegationRegistry.deploy(deployer);
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
                spaceOwner, // spaceOwner
                userEntitlement, // userEntitlement
                ruleEntitlement, // ruleEntitlement
                legacyRuleEntitlement // legacyRuleEntitlement
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
            pausableHelper.makeCut(pausable, IDiamond.FacetCutAction.Add),
            pausable,
            pausableHelper.makeInitData("")
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
            eip712Helper.makeCut(eip712, IDiamond.FacetCutAction.Add),
            eip712,
            eip712Helper.makeInitData("SpaceFactory", "1")
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
                pausable = pausableHelper.deploy(deployer);
                addFacet(
                    pausableHelper.makeCut(pausable, IDiamond.FacetCutAction.Add),
                    pausable,
                    pausableHelper.makeInitData("")
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
                eip712 = eip712Helper.deploy(deployer);
                addFacet(
                    eip712Helper.makeCut(eip712, IDiamond.FacetCutAction.Add),
                    eip712,
                    eip712Helper.makeInitData("SpaceFactory", "1")
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
