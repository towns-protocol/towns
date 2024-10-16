// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";

// helpers
import {DiamondHelper} from "contracts/test/diamond/Diamond.t.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";

// contracts
import {Diamond} from "contracts/src/diamond/Diamond.sol";

import {Architect} from "contracts/src/factory/facets/architect/Architect.sol";
import {ProxyManager} from "contracts/src/diamond/proxy/manager/ProxyManager.sol";

// space helpers
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

// deployments
import {DeployOwnable} from "contracts/scripts/deployments/facets/DeployOwnable.s.sol";
import {DeployDiamondCut} from "contracts/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "contracts/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "contracts/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployMetadata} from "contracts/scripts/deployments/facets/DeployMetadata.s.sol";
import {DeployArchitect} from "contracts/scripts/deployments/facets/DeployArchitect.s.sol";
import {DeployCreateSpace} from "contracts/scripts/deployments/facets/DeployCreateSpace.s.sol";
import {DeployProxyManager} from "contracts/scripts/deployments/facets/DeployProxyManager.s.sol";

import {DeployUserEntitlement} from "contracts/scripts/deployments/utils/DeployUserEntitlement.s.sol";
import {DeployMultiInit} from "contracts/scripts/deployments/utils/DeployMultiInit.s.sol";
import {DeploySpace} from "contracts/scripts/deployments/diamonds/DeploySpace.s.sol";
import {DeploySpaceOwner} from "contracts/scripts/deployments/diamonds/DeploySpaceOwner.s.sol";
import {DeployRuleEntitlement} from "contracts/scripts/deployments/utils/DeployRuleEntitlement.s.sol";
import {DeployRuleEntitlementV2} from "contracts/scripts/deployments/utils/DeployRuleEntitlementV2.s.sol";
import {DeployWalletLink} from "contracts/scripts/deployments/facets/DeployWalletLink.s.sol";
import {DeployTieredLogPricing} from "contracts/scripts/deployments/utils/DeployTieredLogPricing.s.sol";
import {DeployFixedPricing} from "contracts/scripts/deployments/utils/DeployFixedPricing.s.sol";
import {DeployPricingModules} from "contracts/scripts/deployments/facets/DeployPricingModules.s.sol";
import {DeployImplementationRegistry} from "contracts/scripts/deployments/facets/DeployImplementationRegistry.s.sol";
import {DeployPausable} from "contracts/scripts/deployments/facets/DeployPausable.s.sol";
import {DeployPlatformRequirements} from "contracts/scripts/deployments/facets/DeployPlatformRequirements.s.sol";
import {DeployEIP712Facet} from "contracts/scripts/deployments/facets/DeployEIP712Facet.s.sol";
import {DeployPartnerRegistry} from "contracts/scripts/deployments/facets/DeployPartnerRegistry.s.sol";

import {DeployMockLegacyArchitect} from "contracts/scripts/deployments/facets/DeployMockLegacyArchitect.s.sol";
import {DeploySpaceProxyInitializer} from "contracts/scripts/deployments/utils/DeploySpaceProxyInitializer.s.sol";
import {DeploySpaceFactoryInit} from "contracts/scripts/deployments/facets/DeploySpaceFactoryInit.s.sol";

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
  DeployImplementationRegistry registryHelper =
    new DeployImplementationRegistry();
  DeployWalletLink walletLinkHelper = new DeployWalletLink();
  DeployProxyManager proxyManagerHelper = new DeployProxyManager();
  DeployPausable pausableHelper = new DeployPausable();
  DeployPlatformRequirements platformReqsHelper =
    new DeployPlatformRequirements();
  DeployEIP712Facet eip712Helper = new DeployEIP712Facet();
  DeployMockLegacyArchitect deployMockLegacyArchitect =
    new DeployMockLegacyArchitect();
  DeployPartnerRegistry partnerRegistryHelper = new DeployPartnerRegistry();
  DeployMultiInit deployMultiInit = new DeployMultiInit();

  // dependencies
  DeploySpace deploySpace = new DeploySpace();
  DeploySpaceOwner deploySpaceOwner = new DeploySpaceOwner();
  DeployUserEntitlement deployUserEntitlement = new DeployUserEntitlement();
  DeployRuleEntitlement deployLegacyRuleEntitlement =
    new DeployRuleEntitlement();
  DeployRuleEntitlementV2 deployRuleEntitlementV2 =
    new DeployRuleEntitlementV2();

  DeployTieredLogPricing deployTieredLogPricing = new DeployTieredLogPricing();
  DeployFixedPricing deployFixedPricing = new DeployFixedPricing();
  DeploySpaceProxyInitializer deploySpaceProxyInitializer =
    new DeploySpaceProxyInitializer();

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

  // external contracts
  address public spaceImpl;
  address public userEntitlement;
  address public legacyRuleEntitlement;
  address public ruleEntitlement;
  address public spaceOwner;
  address public spaceProxyInitializer;
  address public tieredLogPricing;
  address public fixedPricing;
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
    tieredLogPricing = deployTieredLogPricing.deploy(deployer);
    fixedPricing = deployFixedPricing.deploy(deployer);

    // pricing modules
    pricingModules.push(tieredLogPricing);
    pricingModules.push(fixedPricing);

    multiInit = deployMultiInit.deploy(deployer);

    diamondCut = diamondCutHelper.deploy(deployer);
    diamondLoupe = diamondLoupeHelper.deploy(deployer);
    introspection = introspectionHelper.deploy(deployer);
    ownable = ownableHelper.deploy(deployer);

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

  function diamondInitParams(
    address deployer
  ) public returns (Diamond.InitParams memory) {
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

    // legacy
    legacyArchitect = deployMockLegacyArchitect.deploy(deployer);
    spaceProxyInitializer = deploySpaceProxyInitializer.deploy(deployer);
    spaceFactoryInit = deploySpaceFactoryInit.deploy(deployer);
    spaceFactoryInitData = deploySpaceFactoryInit.makeInitData(
      spaceProxyInitializer
    );

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
    addFacet(
      deployMockLegacyArchitect.makeCut(
        legacyArchitect,
        IDiamond.FacetCutAction.Add
      ),
      legacyArchitect,
      deployMockLegacyArchitect.makeInitData("")
    );
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
        0.005 ether, // membershipFee
        1_000, // membershipFreeAllocation
        365 days, // membershipDuration
        0.001 ether // membershipMinPrice
      )
    );
    addFacet(
      pricingModulesHelper.makeCut(
        pricingModulesFacet,
        IDiamond.FacetCutAction.Add
      ),
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
      walletLinkHelper.makeInitData("")
    );
    addFacet(
      eip712Helper.makeCut(eip712, IDiamond.FacetCutAction.Add),
      eip712,
      eip712Helper.makeInitData("SpaceFactory", "1")
    );
    addFacet(
      partnerRegistryHelper.makeCut(
        partnerRegistry,
        IDiamond.FacetCutAction.Add
      ),
      partnerRegistry,
      partnerRegistryHelper.makeInitData("")
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

  function diamondInitParamsFromFacets(
    address deployer,
    string[] memory facets
  ) public {
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
      } else if (
        facetNameHash == keccak256(abi.encodePacked("MockLegacyArchitect"))
      ) {
        legacyArchitect = deployMockLegacyArchitect.deploy(deployer);
        addFacet(
          deployMockLegacyArchitect.makeCut(
            legacyArchitect,
            IDiamond.FacetCutAction.Add
          ),
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
      } else if (
        facetNameHash == keccak256(abi.encodePacked("PausableFacet"))
      ) {
        pausable = pausableHelper.deploy(deployer);
        addFacet(
          pausableHelper.makeCut(pausable, IDiamond.FacetCutAction.Add),
          pausable,
          pausableHelper.makeInitData("")
        );
      } else if (
        facetNameHash ==
        keccak256(abi.encodePacked("PlatformRequirementsFacet"))
      ) {
        platformReqs = platformReqsHelper.deploy(deployer);
        addFacet(
          platformReqsHelper.makeCut(platformReqs, IDiamond.FacetCutAction.Add),
          platformReqs,
          platformReqsHelper.makeInitData(
            deployer, // feeRecipient
            500, // membershipBps 5%
            0.005 ether, // membershipFee
            1_000, // membershipFreeAllocation
            365 days, // membershipDuration
            0.001 ether // membershipMinPrice
          )
        );
      } else if (
        facetNameHash == keccak256(abi.encodePacked("PricingModulesFacet"))
      ) {
        pricingModulesFacet = pricingModulesHelper.deploy(deployer);
        addFacet(
          pricingModulesHelper.makeCut(
            pricingModulesFacet,
            IDiamond.FacetCutAction.Add
          ),
          pricingModulesFacet,
          pricingModulesHelper.makeInitData(pricingModules)
        );
      } else if (
        facetNameHash == keccak256(abi.encodePacked("ImplementationRegistry"))
      ) {
        registry = registryHelper.deploy(deployer);
        addFacet(
          registryHelper.makeCut(registry, IDiamond.FacetCutAction.Add),
          registry,
          registryHelper.makeInitData("")
        );
      } else if (facetNameHash == keccak256(abi.encodePacked("WalletLink"))) {
        walletLink = walletLinkHelper.deploy(deployer);
        addFacet(
          walletLinkHelper.makeCut(walletLink, IDiamond.FacetCutAction.Add),
          walletLink,
          walletLinkHelper.makeInitData("")
        );
      } else if (facetNameHash == keccak256(abi.encodePacked("EIP712Facet"))) {
        eip712 = eip712Helper.deploy(deployer);
        addFacet(
          eip712Helper.makeCut(eip712, IDiamond.FacetCutAction.Add),
          eip712,
          eip712Helper.makeInitData("SpaceFactory", "1")
        );
      } else if (
        facetNameHash == keccak256(abi.encodePacked("PartnerRegistry"))
      ) {
        partnerRegistry = partnerRegistryHelper.deploy(deployer);
        addFacet(
          partnerRegistryHelper.makeCut(
            partnerRegistry,
            IDiamond.FacetCutAction.Add
          ),
          partnerRegistry,
          partnerRegistryHelper.makeInitData("")
        );
      } else if (
        facetNameHash == keccak256(abi.encodePacked("CreateSpaceFacet"))
      ) {
        create = createSpaceHelper.deploy(deployer);
        addFacet(
          createSpaceHelper.makeCut(create, IDiamond.FacetCutAction.Add),
          create,
          createSpaceHelper.makeInitData("")
        );
      }
    }
  }

  function __deploy(address deployer) public override returns (address) {
    addImmutableCuts(deployer);

    Diamond.InitParams memory initDiamondCut = diamondInitParams(deployer);
    vm.broadcast(deployer);
    Diamond diamond = new Diamond(initDiamondCut);

    return address(diamond);
  }
}
