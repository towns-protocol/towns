// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";
import {ISpaceOwner} from "contracts/src/spaces/facets/owner/ISpaceOwner.sol";

// helpers
import {DiamondDeployer} from "../common/DiamondDeployer.s.sol";

// contracts
import {Diamond} from "contracts/src/diamond/Diamond.sol";
import {DiamondCutFacet} from "contracts/src/diamond/facets/cut/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "contracts/src/diamond/facets/loupe/DiamondLoupeFacet.sol";
import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";

import {Architect} from "contracts/src/spaces/facets/architect/Architect.sol";
import {ProxyManager} from "contracts/src/diamond/proxy/manager/ProxyManager.sol";
import {OwnableFacet} from "contracts/src/diamond/facets/ownable/OwnableFacet.sol";
import {PausableFacet} from "contracts/src/diamond/facets/pausable/PausableFacet.sol";
import {PlatformRequirementsFacet} from "contracts/src/spaces/facets/platform/requirements/PlatformRequirementsFacet.sol";
import {PrepayFacet} from "contracts/src/spaces/facets/prepay/PrepayFacet.sol";

// diamond helpers
import {DiamondCutHelper} from "contracts/test/diamond/cut/DiamondCutSetup.sol";
import {DiamondLoupeHelper} from "contracts/test/diamond/loupe/DiamondLoupeSetup.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";

// space helpers
import {ArchitectHelper} from "contracts/test/spaces/architect/ArchitectHelper.sol";
import {ProxyManagerHelper} from "contracts/test/diamond/proxy/ProxyManagerSetup.sol";
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {PausableHelper} from "contracts/test/diamond/pausable/PausableSetup.sol";
import {PlatformRequirementsHelper} from "contracts/test/spaces/platform/requirements/PlatformRequirementsHelper.sol";
import {PrepayHelper} from "contracts/test/spaces/prepay/PrepayHelper.sol";
import {PricingModulesHelper} from "contracts/test/spaces/architect/pricing/PricingModulesHelper.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

// deployments
import {DeployUserEntitlement} from "contracts/scripts/deployments/DeployUserEntitlement.s.sol";
import {DeployMultiInit} from "contracts/scripts/deployments/DeployMultiInit.s.sol";
import {DeploySpace} from "contracts/scripts/deployments/DeploySpace.s.sol";
import {DeploySpaceOwner} from "contracts/scripts/deployments/DeploySpaceOwner.s.sol";
import {DeployRuleEntitlement} from "contracts/scripts/deployments/DeployRuleEntitlement.s.sol";
import {DeployWalletLink} from "contracts/scripts/deployments/DeployWalletLink.s.sol";
import {DeployTieredLogPricing} from "contracts/scripts/deployments/DeployTieredLogPricing.s.sol";
import {DeployFixedPricing} from "contracts/scripts/deployments/DeployFixedPricing.s.sol";
import {DeployPricingModules} from "contracts/scripts/deployments/facets/DeployPricingModules.s.sol";

contract DeploySpaceFactory is DiamondDeployer {
  DeployMultiInit deployMultiInit = new DeployMultiInit();
  DeploySpace deploySpace = new DeploySpace();
  DeploySpaceOwner deploySpaceOwner = new DeploySpaceOwner();
  DeployUserEntitlement deployUserEntitlement = new DeployUserEntitlement();
  DeployRuleEntitlement deployRuleEntitlement = new DeployRuleEntitlement();
  DeployWalletLink deployWalletLink = new DeployWalletLink();
  DeployTieredLogPricing deployTieredLogPricing = new DeployTieredLogPricing();
  DeployFixedPricing deployFixedPricing = new DeployFixedPricing();
  DeployPricingModules deployPricingModules = new DeployPricingModules();

  // diamond helpers
  DiamondCutHelper cutHelper = new DiamondCutHelper();
  DiamondLoupeHelper loupeHelper = new DiamondLoupeHelper();
  IntrospectionHelper introspectionHelper = new IntrospectionHelper();

  // helpers
  ArchitectHelper architectHelper = new ArchitectHelper();
  OwnableHelper ownableHelper = new OwnableHelper();
  PausableHelper pausableHelper = new PausableHelper();
  PlatformRequirementsHelper platformReqsHelper =
    new PlatformRequirementsHelper();
  PrepayHelper prepayHelper = new PrepayHelper();
  ProxyManagerHelper proxyManagerHelper = new ProxyManagerHelper();
  PricingModulesHelper pricingModulesHelper = new PricingModulesHelper();

  uint256 totalFacets = 10;
  uint256 totalInit = 10;

  address[] initAddresses = new address[](totalInit);
  bytes[] initDatas = new bytes[](totalInit);

  // diamond addresses
  address diamondCut;
  address diamondLoupe;
  address introspection;

  // space addresses
  address architect;
  address proxyManager;
  address ownable;
  address pausable;
  address platformReqs;
  address prepay;

  address public userEntitlement;
  address public ruleEntitlement;
  address public walletLink;
  address public spaceOwner;

  address public tieredLogPricing;
  address public fixedPricing;

  function versionName() public pure override returns (string memory) {
    return "spaceFactory";
  }

  function diamondInitParams(
    uint256 deployerPK,
    address deployer
  ) public override returns (Diamond.InitParams memory) {
    address multiInit = deployMultiInit.deploy();

    address space = deploySpace.deploy();
    spaceOwner = deploySpaceOwner.deploy();

    // entitlement modules
    userEntitlement = deployUserEntitlement.deploy();
    ruleEntitlement = deployRuleEntitlement.deploy();

    // wallet link
    walletLink = deployWalletLink.deploy();

    // pricing modules
    tieredLogPricing = deployTieredLogPricing.deploy();
    fixedPricing = deployFixedPricing.deploy();

    // pricing modules facet
    address pricingModulesFacet = deployPricingModules.deploy();
    address[] memory pricingModules = new address[](2);
    pricingModules[0] = tieredLogPricing;
    pricingModules[1] = fixedPricing;

    vm.startBroadcast(deployerPK);
    diamondCut = address(new DiamondCutFacet());
    diamondLoupe = address(new DiamondLoupeFacet());
    introspection = address(new IntrospectionFacet());

    architect = address(new Architect());
    proxyManager = address(new ProxyManager());
    ownable = address(new OwnableFacet());
    pausable = address(new PausableFacet());
    platformReqs = address(new PlatformRequirementsFacet());
    prepay = address(new PrepayFacet());
    vm.stopBroadcast();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](totalFacets);

    cuts[index++] = cutHelper.makeCut(diamondCut, IDiamond.FacetCutAction.Add);
    cuts[index++] = loupeHelper.makeCut(
      diamondLoupe,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = introspectionHelper.makeCut(
      introspection,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = architectHelper.makeCut(
      architect,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = proxyManagerHelper.makeCut(
      proxyManager,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = ownableHelper.makeCut(ownable, IDiamond.FacetCutAction.Add);
    cuts[index++] = pausableHelper.makeCut(
      pausable,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = platformReqsHelper.makeCut(
      platformReqs,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = prepayHelper.makeCut(prepay, IDiamond.FacetCutAction.Add);
    cuts[index++] = pricingModulesHelper.makeCut(
      pricingModulesFacet,
      IDiamond.FacetCutAction.Add
    );

    _resetIndex();

    initAddresses[index++] = diamondCut;
    initAddresses[index++] = diamondLoupe;
    initAddresses[index++] = introspection;

    initAddresses[index++] = architect;
    initAddresses[index++] = proxyManager;
    initAddresses[index++] = ownable;
    initAddresses[index++] = pausable;
    initAddresses[index++] = platformReqs;
    initAddresses[index++] = prepay;
    initAddresses[index++] = pricingModulesFacet;

    _resetIndex();

    initDatas[index++] = cutHelper.makeInitData("");
    initDatas[index++] = loupeHelper.makeInitData("");
    initDatas[index++] = introspectionHelper.makeInitData("");
    initDatas[index++] = abi.encodeWithSelector(
      architectHelper.initializer(),
      spaceOwner, // spaceOwner
      userEntitlement, // userEntitlement
      ruleEntitlement, // ruleEntitlement
      walletLink // walletLink
    );
    initDatas[index++] = proxyManagerHelper.makeInitData(space);

    initDatas[index++] = ownableHelper.makeInitData(deployer);
    initDatas[index++] = pausableHelper.makeInitData("");
    initDatas[index++] = abi.encodeWithSelector(
      platformReqsHelper.initializer(),
      deployer, // feeRecipient
      500, // membershipBps 5%
      0.005 ether, // membershipFee
      1_000, // membershipFreeAllocation
      365 days // membershipDuration
    );
    initDatas[index++] = prepayHelper.makeInitData("");
    initDatas[index++] = abi.encodeWithSelector(
      pricingModulesHelper.initializer(),
      pricingModules
    );

    return
      Diamond.InitParams({
        baseFacets: cuts,
        init: multiInit,
        initData: abi.encodeWithSelector(
          MultiInit.multiInit.selector,
          initAddresses,
          initDatas
        )
      });
  }

  function postDeploy(address deployer, address spaceFactory) public override {
    vm.startBroadcast(deployer);
    ISpaceOwner(spaceOwner).setFactory(address(spaceFactory));
    vm.stopBroadcast();
  }
}
