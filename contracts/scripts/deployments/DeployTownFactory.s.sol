// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";

// libraries

// contracts
import {TownOwner} from "contracts/src/towns/facets/owner/TownOwner.sol";
import {DiamondCutFacet} from "contracts/src/diamond/facets/cut/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "contracts/src/diamond/facets/loupe/DiamondLoupeFacet.sol";
import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";
import {OwnableFacet} from "contracts/src/diamond/facets/ownable/OwnableFacet.sol";
import {ProxyManager} from "contracts/src/diamond/proxy/manager/ProxyManager.sol";
import {PausableFacet} from "contracts/src/diamond/facets/pausable/PausableFacet.sol";
import {ERC721Holder} from "openzeppelin-contracts/contracts/token/ERC721/utils/ERC721Holder.sol";
import {TownArchitect} from "contracts/src/towns/facets/architect/TownArchitect.sol";
import {PlatformFeeFacet} from "contracts/src/towns/facets/platform/fee/PlatformFeeFacet.sol";
import {Diamond} from "contracts/src/diamond/Diamond.sol";

// helpers
import {Deployer} from "../common/Deployer.s.sol";
import {DeployPioneer} from "contracts/scripts/deployments/DeployPioneer.s.sol";
import {DeployTownOwner} from "contracts/scripts/deployments/DeployTownOwner.s.sol";
import {DeployTokenEntitlement, DeployUserEntitlement} from "contracts/scripts/deployments/DeployEntitlements.s.sol";
import {DeployTown} from "contracts/scripts/deployments/DeployTown.s.sol";

// helpers
import {DiamondCutHelper} from "contracts/test/diamond/cut/DiamondCutSetup.sol";
import {DiamondLoupeHelper} from "contracts/test/diamond/loupe/DiamondLoupeSetup.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";

import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {ProxyManagerHelper} from "contracts/test/diamond/proxy/ProxyManagerSetup.sol";
import {PausableHelper} from "contracts/test/diamond/pausable/PausableSetup.sol";
import {ERC721HolderHelper} from "contracts/test/towns/holder/ERC721HolderSetup.sol";
import {TownArchitectHelper} from "contracts/test/towns/architect/TownArchitectSetup.sol";
import {PlatformFeeHelper} from "contracts/test/towns/platform/fee/PlatformFeeSetup.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

// mocks

contract DeployTownFactory is Deployer {
  // dependencies
  DeployPioneer deployPioneer = new DeployPioneer();
  DeployTownOwner deployTownOwner = new DeployTownOwner();
  DeployTokenEntitlement deployTokenEntitlement = new DeployTokenEntitlement();
  DeployUserEntitlement deployUserEntitlement = new DeployUserEntitlement();
  DeployTown deployTown = new DeployTown();

  // helpers
  TownArchitectHelper townArchitectHelper = new TownArchitectHelper();
  ProxyManagerHelper proxyManagerHelper = new ProxyManagerHelper();
  PausableHelper pausableHelper = new PausableHelper();
  ERC721HolderHelper holderHelper = new ERC721HolderHelper();
  OwnableHelper ownableHelper = new OwnableHelper();
  DiamondCutHelper cutHelper = new DiamondCutHelper();
  DiamondLoupeHelper loupeHelper = new DiamondLoupeHelper();
  IntrospectionHelper introspectionHelper = new IntrospectionHelper();
  PlatformFeeHelper platformFeeHelper = new PlatformFeeHelper();

  uint256 totalFacets = 9;
  uint256 totalInit = 8;

  address[] initAddresses = new address[](totalInit);
  bytes[] initDatas = new bytes[](totalInit);

  address diamondCut;
  address diamondLoupe;
  address introspection;

  address ownable;
  address proxyManager;
  address pausable;
  address holder;
  address architect;
  address platformFee;
  address multiInit;

  function versionName() public pure override returns (string memory) {
    return "townFactory";
  }

  function __deploy(
    uint256 deployerPK,
    address deployer
  ) public override returns (address) {
    address pioneerToken = deployPioneer.deploy();
    address townToken = deployTownOwner.deploy();

    vm.startBroadcast(deployerPK);
    diamondCut = address(new DiamondCutFacet());
    diamondLoupe = address(new DiamondLoupeFacet());
    introspection = address(new IntrospectionFacet());
    ownable = address(new OwnableFacet());
    proxyManager = address(new ProxyManager());
    pausable = address(new PausableFacet());
    holder = address(new ERC721Holder());
    architect = address(new TownArchitect());
    platformFee = address(new PlatformFeeFacet());
    multiInit = address(new MultiInit());
    vm.stopBroadcast();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](totalFacets);
    uint256 index;

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
    cuts[index++] = holderHelper.makeCut(holder, IDiamond.FacetCutAction.Add);
    cuts[index++] = ownableHelper.makeCut(ownable, IDiamond.FacetCutAction.Add);
    cuts[index++] = pausableHelper.makeCut(
      pausable,
      IDiamond.FacetCutAction.Add
    );

    cuts[index++] = platformFeeHelper.makeCut(
      platformFee,
      IDiamond.FacetCutAction.Add
    );

    index = 0;

    initAddresses[index++] = diamondCut;
    initAddresses[index++] = diamondLoupe;
    initAddresses[index++] = introspection;
    initAddresses[index++] = architect;
    initAddresses[index++] = proxyManager;
    initAddresses[index++] = ownable;
    initAddresses[index++] = pausable;
    initAddresses[index++] = platformFee;

    index = 0;

    initDatas[index++] = cutHelper.makeInitData("");
    initDatas[index++] = loupeHelper.makeInitData("");
    initDatas[index++] = introspectionHelper.makeInitData("");
    initDatas[index++] = abi.encodeWithSelector(
      townArchitectHelper.initializer(),
      townToken, // townToken
      deployUserEntitlement.deploy(), // userEntitlement
      deployTokenEntitlement.deploy() // tokenEntitlement
    );
    initDatas[index++] = proxyManagerHelper.makeInitData(
      abi.encode(deployTown.deploy())
    );

    initDatas[index++] = ownableHelper.makeInitData(abi.encode(deployer));
    initDatas[index++] = pausableHelper.makeInitData("");
    initDatas[index++] = abi.encodeWithSelector(
      platformFeeHelper.initializer(),
      deployer,
      0,
      0
    );

    vm.startBroadcast(deployerPK);
    address townFactory = address(
      new Diamond(
        Diamond.InitParams({
          baseFacets: cuts,
          init: multiInit,
          initData: abi.encodeWithSelector(
            MultiInit.multiInit.selector,
            initAddresses,
            initDatas
          )
        })
      )
    );
    TownOwner(townToken).setFactory(address(townFactory));
    TownArchitect(townFactory).gateByToken(pioneerToken, 1);
    vm.stopBroadcast();

    return townFactory;
  }
}
