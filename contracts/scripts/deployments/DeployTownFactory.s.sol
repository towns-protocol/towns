// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";
import {ITownOwner} from "contracts/src/towns/facets/owner/ITownOwner.sol";

// helpers
import {DiamondDeployer} from "../common/DiamondDeployer.s.sol";

// contracts
import {Diamond} from "contracts/src/diamond/Diamond.sol";
import {DiamondCutFacet} from "contracts/src/diamond/facets/cut/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "contracts/src/diamond/facets/loupe/DiamondLoupeFacet.sol";
import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";

import {TownArchitect} from "contracts/src/towns/facets/architect/TownArchitect.sol";
import {ProxyManager} from "contracts/src/diamond/proxy/manager/ProxyManager.sol";
import {ERC721Holder} from "openzeppelin-contracts/contracts/token/ERC721/utils/ERC721Holder.sol";
import {OwnableFacet} from "contracts/src/diamond/facets/ownable/OwnableFacet.sol";
import {PausableFacet} from "contracts/src/diamond/facets/pausable/PausableFacet.sol";
import {PlatformRequirementsFacet} from "contracts/src/towns/facets/platform/requirements/PlatformRequirementsFacet.sol";

// diamond helpers
import {DiamondCutHelper} from "contracts/test/diamond/cut/DiamondCutSetup.sol";
import {DiamondLoupeHelper} from "contracts/test/diamond/loupe/DiamondLoupeSetup.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";

// town helpers
import {TownArchitectHelper} from "contracts/test/towns/architect/TownArchitectSetup.sol";
import {ProxyManagerHelper} from "contracts/test/diamond/proxy/ProxyManagerSetup.sol";
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {PausableHelper} from "contracts/test/diamond/pausable/PausableSetup.sol";
import {PlatformRequirementsHelper} from "contracts/test/towns/platform/requirements/PlatformRequirementsSetup.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

// mocks

contract DeployTownFactory is DiamondDeployer {
  // diamond helpers
  DiamondCutHelper cutHelper = new DiamondCutHelper();
  DiamondLoupeHelper loupeHelper = new DiamondLoupeHelper();
  IntrospectionHelper introspectionHelper = new IntrospectionHelper();

  // helpers
  TownArchitectHelper townArchitectHelper = new TownArchitectHelper();
  ProxyManagerHelper proxyManagerHelper = new ProxyManagerHelper();
  OwnableHelper ownableHelper = new OwnableHelper();
  PausableHelper pausableHelper = new PausableHelper();
  PlatformRequirementsHelper platformReqsHelper =
    new PlatformRequirementsHelper();

  uint256 totalFacets = 8;
  uint256 totalInit = 8;

  address[] initAddresses = new address[](totalInit);
  bytes[] initDatas = new bytes[](totalInit);

  // diamond addresses
  address diamondCut;
  address diamondLoupe;
  address introspection;

  // town addresses
  address architect;
  address proxyManager;
  address holder;
  address ownable;
  address pausable;
  address platformReqs;

  function versionName() public pure override returns (string memory) {
    return "townFactory";
  }

  function diamondInitParams(
    uint256 deployerPK,
    address deployer
  ) public override returns (Diamond.InitParams memory) {
    vm.startBroadcast(deployerPK);
    diamondCut = address(new DiamondCutFacet());
    diamondLoupe = address(new DiamondLoupeFacet());
    introspection = address(new IntrospectionFacet());

    architect = address(new TownArchitect());
    proxyManager = address(new ProxyManager());
    holder = address(new ERC721Holder());
    ownable = address(new OwnableFacet());
    pausable = address(new PausableFacet());
    platformReqs = address(new PlatformRequirementsFacet());

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
    cuts[index++] = townArchitectHelper.makeCut(
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

    _resetIndex();

    initAddresses[index++] = diamondCut;
    initAddresses[index++] = diamondLoupe;
    initAddresses[index++] = introspection;

    initAddresses[index++] = architect;
    initAddresses[index++] = proxyManager;
    initAddresses[index++] = ownable;
    initAddresses[index++] = pausable;
    initAddresses[index++] = platformReqs;

    _resetIndex();

    initDatas[index++] = cutHelper.makeInitData("");
    initDatas[index++] = loupeHelper.makeInitData("");
    initDatas[index++] = introspectionHelper.makeInitData("");
    initDatas[index++] = abi.encodeWithSelector(
      townArchitectHelper.initializer(),
      getDeployment("townOwner"), // townToken
      getDeployment("userEntitlement"), // userEntitlement
      getDeployment("tokenEntitlement") // tokenEntitlement
    );
    initDatas[index++] = proxyManagerHelper.makeInitData(
      abi.encode(getDeployment("town"))
    );

    initDatas[index++] = ownableHelper.makeInitData(abi.encode(deployer));
    initDatas[index++] = pausableHelper.makeInitData("");
    initDatas[index++] = abi.encodeWithSelector(
      platformReqsHelper.initializer(),
      deployer, // feeRecipient
      500, // membershipBps 5%
      1 ether, // membershipFee
      1_000, // membershipMintLimit
      365 days // membershipDuration
    );

    return
      Diamond.InitParams({
        baseFacets: cuts,
        init: getDeployment("multiInit"),
        initData: abi.encodeWithSelector(
          MultiInit.multiInit.selector,
          initAddresses,
          initDatas
        )
      });
  }

  function _afterDeployment(
    uint256 pk,
    address,
    address townFactory
  ) internal override {
    address townToken = getDeployment("townOwner");

    vm.startBroadcast(pk);
    ITownOwner(townToken).setFactory(address(townFactory));
    vm.stopBroadcast();
  }
}
