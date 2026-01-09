// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamondInitHelper} from "./IDiamondInitHelper.sol";

// libraries
import {DeployDiamondCut} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.sol";
import {DeployDiamondLoupe} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.sol";
import {DeployEIP712Facet} from "@towns-protocol/diamond/scripts/deployments/facets/DeployEIP712Facet.sol";
import {DeployIntrospection} from "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.sol";
import {DeployOwnable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployOwnable.sol";
import {DeployPausable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployPausable.sol";
import {DeployProxyManager} from "@towns-protocol/diamond/scripts/deployments/utils/DeployProxyManager.sol";
import {DeployFeatureManager} from "../facets/DeployFeatureManager.s.sol";
import {DeployMetadata} from "../facets/DeployMetadata.s.sol";
import {DeployPricingModules} from "../facets/DeployPricingModules.s.sol";
import {DeployArchitect} from "../facets/DeployArchitect.s.sol";
import {DeployCreateSpace} from "../facets/DeployCreateSpace.s.sol";
import {DeployImplementationRegistry} from "../facets/DeployImplementationRegistry.s.sol";
import {DeployMockLegacyArchitect} from "../facets/DeployMockLegacyArchitect.s.sol";
import {DeployPartnerRegistry} from "../facets/DeployPartnerRegistry.s.sol";
import {DeployPlatformRequirements} from "../facets/DeployPlatformRequirements.s.sol";
import {DeployWalletLink} from "../facets/DeployWalletLink.s.sol";
import {DeployFeeManager} from "../facets/DeployFeeManager.s.sol";
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
    address public mockDelegationRegistry;

    function versionName() public pure override returns (string memory) {
        return "spaceFactory";
    }

    function addImmutableCuts(address deployer) internal {
        spaceImpl = deploySpace.deploy(deployer);
        spaceOwner = deploySpaceOwner.deploy(deployer);

        // Queue up all core facets for batch deployment
        facetHelper.add("DiamondCutFacet");
        facetHelper.add("DiamondLoupeFacet");
        facetHelper.add("IntrospectionFacet");
        facetHelper.add("OwnableFacet");
        facetHelper.add("UserEntitlement");
        facetHelper.add("RuleEntitlementV2");
        facetHelper.add("RuleEntitlement");
        facetHelper.add("FixedPricing");

        // Deploy the first batch of facets
        facetHelper.deployBatch(deployer);

        // entitlement modules
        userEntitlement = facetHelper.getDeployedAddress("UserEntitlement");
        ruleEntitlement = facetHelper.getDeployedAddress("RuleEntitlementV2");
        legacyRuleEntitlement = facetHelper.getDeployedAddress("RuleEntitlement");

        // pricing modules
        tieredLogPricingV2 = deployTieredLogPricingV2.deploy(deployer);
        tieredLogPricingV3 = deployTieredLogPricingV3.deploy(deployer);
        fixedPricing = facetHelper.getDeployedAddress("FixedPricing");

        // pricing modules
        pricingModules.push(tieredLogPricingV2);
        pricingModules.push(tieredLogPricingV3);
        pricingModules.push(fixedPricing);

        address facet = facetHelper.getDeployedAddress("DiamondCutFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployDiamondCut.selectors()),
            facet,
            DeployDiamondCut.makeInitData()
        );

        facet = facetHelper.getDeployedAddress("DiamondLoupeFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployDiamondLoupe.selectors()),
            facet,
            DeployDiamondLoupe.makeInitData()
        );

        facet = facetHelper.getDeployedAddress("IntrospectionFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployIntrospection.selectors()),
            facet,
            DeployIntrospection.makeInitData()
        );

        facet = facetHelper.getDeployedAddress("OwnableFacet");
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
        facetHelper.add("Architect");
        facetHelper.add("CreateSpaceFacet");
        facetHelper.add("ProxyManager");
        facetHelper.add("PausableFacet");
        facetHelper.add("PlatformRequirementsFacet");
        facetHelper.add("PricingModulesFacet");
        facetHelper.add("ImplementationRegistryFacet");
        facetHelper.add("SCL_EIP6565");
        facetHelper.add("WalletLink");
        facetHelper.add("EIP712Facet");
        facetHelper.add("PartnerRegistry");
        facetHelper.add("FeatureManagerFacet");
        facetHelper.add("FeeManagerFacet");

        if (isAnvil()) {
            facetHelper.add("MockDelegationRegistry");
            facetHelper.add("MockLegacyArchitect");
        }

        // Deploy all facets
        facetHelper.deployBatch(deployer);

        if (isAnvil()) {
            mockDelegationRegistry = facetHelper.getDeployedAddress("MockDelegationRegistry");
            address legacyArchitect = facetHelper.getDeployedAddress("MockLegacyArchitect");
            addFacet(
                makeCut(legacyArchitect, FacetCutAction.Add, DeployMockLegacyArchitect.selectors()),
                legacyArchitect,
                DeployMockLegacyArchitect.makeInitData()
            );
        } else {
            mockDelegationRegistry = 0x00000000000000447e69651d841bD8D104Bed493;
        }

        address facet = facetHelper.getDeployedAddress("MetadataFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployMetadata.selectors()),
            facet,
            DeployMetadata.makeInitData(bytes32("SpaceFactory"), "")
        );

        facet = facetHelper.getDeployedAddress("Architect");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployArchitect.selectors()),
            facet,
            DeployArchitect.makeInitData(
                spaceOwner,
                userEntitlement,
                ruleEntitlement,
                legacyRuleEntitlement
            )
        );

        facet = facetHelper.getDeployedAddress("CreateSpaceFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployCreateSpace.selectors()),
            facet,
            DeployCreateSpace.makeInitData()
        );

        facet = facetHelper.getDeployedAddress("ProxyManager");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployProxyManager.selectors()),
            facet,
            DeployProxyManager.makeInitData(spaceImpl)
        );

        facet = facetHelper.getDeployedAddress("PausableFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployPausable.selectors()),
            facet,
            DeployPausable.makeInitData()
        );

        facet = facetHelper.getDeployedAddress("PlatformRequirementsFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployPlatformRequirements.selectors()),
            facet,
            DeployPlatformRequirements.makeInitData(
                deployer, // feeRecipient
                1000, // membershipBps 10%
                0.0005 ether, // membershipFee
                1000, // membershipFreeAllocation
                365 days, // membershipDuration
                0.001 ether // membershipMinPrice
            )
        );

        facet = facetHelper.getDeployedAddress("PricingModulesFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployPricingModules.selectors()),
            facet,
            DeployPricingModules.makeInitData(pricingModules)
        );

        facet = facetHelper.getDeployedAddress("ImplementationRegistryFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployImplementationRegistry.selectors()),
            facet,
            DeployImplementationRegistry.makeInitData()
        );

        address sclEip6565 = facetHelper.getDeployedAddress("SCL_EIP6565");
        facet = facetHelper.getDeployedAddress("WalletLink");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployWalletLink.selectors()),
            facet,
            DeployWalletLink.makeInitData(sclEip6565)
        );

        facet = facetHelper.getDeployedAddress("EIP712Facet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployEIP712Facet.selectors()),
            facet,
            DeployEIP712Facet.makeInitData("SpaceFactory", "1")
        );

        facet = facetHelper.getDeployedAddress("PartnerRegistry");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployPartnerRegistry.selectors()),
            facet,
            DeployPartnerRegistry.makeInitData()
        );

        facet = facetHelper.getDeployedAddress("FeatureManagerFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployFeatureManager.selectors()),
            facet,
            DeployFeatureManager.makeInitData()
        );

        facet = facetHelper.getDeployedAddress("FeeManagerFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployFeeManager.selectors()),
            facet,
            DeployFeeManager.makeInitData(deployer)
        );

        address multiInit = facetHelper.getDeployedAddress("MultiInit");

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

        if (!facetHelper.isDeployed("SCL_EIP6565")) {
            facetHelper.add("SCL_EIP6565");
        }

        // Deploy all requested facets in a single batch transaction
        facetHelper.deployBatch(deployer);

        for (uint256 i; i < facets.length; ++i) {
            string memory facetName = facets[i];
            address facet = facetHelper.getDeployedAddress(facetName);

            if (facetName.eq("MetadataFacet")) {
                addFacet(
                    makeCut(facet, FacetCutAction.Add, DeployMetadata.selectors()),
                    facet,
                    DeployMetadata.makeInitData(bytes32("SpaceFactory"), "")
                );
            } else if (facetName.eq("Architect")) {
                addFacet(
                    makeCut(facet, FacetCutAction.Add, DeployArchitect.selectors()),
                    facet,
                    DeployArchitect.makeInitData(
                        spaceOwner,
                        userEntitlement,
                        ruleEntitlement,
                        legacyRuleEntitlement
                    )
                );
            } else if (facetName.eq("MockLegacyArchitect")) {
                addFacet(
                    makeCut(facet, FacetCutAction.Add, DeployMockLegacyArchitect.selectors()),
                    facet,
                    DeployMockLegacyArchitect.makeInitData()
                );
            } else if (facetName.eq("ProxyManager")) {
                addFacet(
                    makeCut(facet, FacetCutAction.Add, DeployProxyManager.selectors()),
                    facet,
                    DeployProxyManager.makeInitData(spaceImpl)
                );
            } else if (facetName.eq("PausableFacet")) {
                addFacet(
                    makeCut(facet, FacetCutAction.Add, DeployPausable.selectors()),
                    facet,
                    DeployPausable.makeInitData()
                );
            } else if (facetName.eq("PlatformRequirementsFacet")) {
                addFacet(
                    makeCut(facet, FacetCutAction.Add, DeployPlatformRequirements.selectors()),
                    facet,
                    DeployPlatformRequirements.makeInitData(
                        deployer, // feeRecipient
                        1000, // membershipBps 10%
                        0.0005 ether, // membershipFee
                        1000, // membershipFreeAllocation
                        365 days, // membershipDuration
                        0.001 ether // membershipMinPrice
                    )
                );
            } else if (facetName.eq("PricingModulesFacet")) {
                addFacet(
                    makeCut(facet, FacetCutAction.Add, DeployPricingModules.selectors()),
                    facet,
                    DeployPricingModules.makeInitData(pricingModules)
                );
            } else if (facetName.eq("ImplementationRegistryFacet")) {
                addFacet(
                    makeCut(facet, FacetCutAction.Add, DeployImplementationRegistry.selectors()),
                    facet,
                    DeployImplementationRegistry.makeInitData()
                );
            } else if (facetName.eq("WalletLink")) {
                address sclEip6565 = facetHelper.getDeployedAddress("SCL_EIP6565");
                addFacet(
                    makeCut(facet, FacetCutAction.Add, DeployWalletLink.selectors()),
                    facet,
                    DeployWalletLink.makeInitData(sclEip6565)
                );
            } else if (facetName.eq("EIP712Facet")) {
                addFacet(
                    makeCut(facet, FacetCutAction.Add, DeployEIP712Facet.selectors()),
                    facet,
                    DeployEIP712Facet.makeInitData("SpaceFactory", "1")
                );
            } else if (facetName.eq("PartnerRegistry")) {
                addFacet(
                    makeCut(facet, FacetCutAction.Add, DeployPartnerRegistry.selectors()),
                    facet,
                    DeployPartnerRegistry.makeInitData()
                );
            } else if (facetName.eq("CreateSpaceFacet")) {
                addFacet(
                    makeCut(facet, FacetCutAction.Add, DeployCreateSpace.selectors()),
                    facet,
                    DeployCreateSpace.makeInitData()
                );
            } else if (facetName.eq("FeatureManagerFacet")) {
                addFacet(
                    makeCut(facet, FacetCutAction.Add, DeployFeatureManager.selectors()),
                    facet,
                    DeployFeatureManager.makeInitData()
                );
            } else if (facetName.eq("FeeManagerFacet")) {
                addFacet(
                    makeCut(facet, FacetCutAction.Add, DeployFeeManager.selectors()),
                    facet,
                    DeployFeeManager.makeInitData(deployer)
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
