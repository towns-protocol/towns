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
import {ERC721Holder} from "openzeppelin-contracts/contracts/token/ERC721/utils/ERC721Holder.sol";
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
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

// deployments
import {DeployUserEntitlement} from "contracts/scripts/deployments/DeployUserEntitlement.s.sol";
import {DeployTokenEntitlement} from "contracts/scripts/deployments/DeployTokenEntitlement.s.sol";
import {DeployMultiInit} from "contracts/scripts/deployments/DeployMultiInit.s.sol";
import {DeploySpace} from "contracts/scripts/deployments/DeploySpace.s.sol";
import {DeploySpaceOwner} from "contracts/scripts/deployments/DeploySpaceOwner.s.sol";

contract DeploySpaceFactory is DiamondDeployer {
  DeployMultiInit deployMultiInit = new DeployMultiInit();
  DeploySpace deploySpace = new DeploySpace();
  DeploySpaceOwner deploySpaceOwner = new DeploySpaceOwner();
  DeployUserEntitlement deployUserEntitlement = new DeployUserEntitlement();
  DeployTokenEntitlement deployTokenEntitlement = new DeployTokenEntitlement();

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

  uint256 totalFacets = 9;
  uint256 totalInit = 9;

  address[] initAddresses = new address[](totalInit);
  bytes[] initDatas = new bytes[](totalInit);

  // diamond addresses
  address diamondCut;
  address diamondLoupe;
  address introspection;

  // space addresses
  address architect;
  address proxyManager;
  address holder;
  address ownable;
  address pausable;
  address platformReqs;
  address prepay;

  address public userEntitlement;
  address public tokenEntitlement;
  address public spaceOwner;

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
    userEntitlement = deployUserEntitlement.deploy();
    tokenEntitlement = deployTokenEntitlement.deploy();

    vm.startBroadcast(deployerPK);
    diamondCut = address(new DiamondCutFacet());
    diamondLoupe = address(new DiamondLoupeFacet());
    introspection = address(new IntrospectionFacet());

    architect = address(new Architect());
    proxyManager = address(new ProxyManager());
    holder = address(new ERC721Holder());
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

    _resetIndex();

    initDatas[index++] = cutHelper.makeInitData("");
    initDatas[index++] = loupeHelper.makeInitData("");
    initDatas[index++] = introspectionHelper.makeInitData("");
    initDatas[index++] = abi.encodeWithSelector(
      architectHelper.initializer(),
      spaceOwner,
      userEntitlement, // userEntitlement
      tokenEntitlement // tokenEntitlement
    );
    initDatas[index++] = proxyManagerHelper.makeInitData(space);

    initDatas[index++] = ownableHelper.makeInitData(deployer);
    initDatas[index++] = pausableHelper.makeInitData("");
    initDatas[index++] = abi.encodeWithSelector(
      platformReqsHelper.initializer(),
      deployer, // feeRecipient
      500, // membershipBps 5%
      1 ether, // membershipFee
      1_000, // membershipMintLimit
      365 days // membershipDuration
    );
    initDatas[index++] = prepayHelper.makeInitData("");

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
