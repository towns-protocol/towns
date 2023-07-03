// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";
import {IDiamondCut} from "contracts/src/diamond/extensions/cut/IDiamondCut.sol";

// libraries

// contracts
import {TownOwner} from "contracts/src/tokens/TownOwner.sol";
import {ProxyManager} from "contracts/src/diamond/proxy/manager/ProxyManager.sol";
import {Pausable} from "contracts/src/diamond/extensions/pausable/Pausable.sol";
import {ERC721Holder} from "openzeppelin-contracts/contracts/token/ERC721/utils/ERC721Holder.sol";
import {TownArchitect} from "contracts/src/towns/facets/architect/TownArchitect.sol";
import {TownFactoryInit} from "contracts/src/towns/initializers/TownFactoryInit.sol";
import {TownFactory} from "contracts/src/towns/TownFactory.sol";

// helpers
import {Deployer} from "./common/Deployer.s.sol";
import {DeployPioneer} from "contracts/scripts/DeployPioneer.s.sol";
import {DeployTownOwner} from "contracts/scripts/DeployTownOwner.s.sol";
import {DeployTokenEntitlement, DeployUserEntitlement} from "contracts/scripts/DeployEntitlements.s.sol";
import {DeployTown} from "contracts/scripts/DeployTown.s.sol";

import {ProxyManagerHelper} from "contracts/test/towns/facets/manager/ProxyManagerSetup.sol";
import {PausableHelper} from "contracts/test/diamond/pausable/PausableSetup.sol";
import {ERC721HolderHelper} from "contracts/test/towns/facets/holder/ERC721HolderSetup.sol";
import {TownArchitectHelper} from "contracts/test/towns/facets/architect/TownArchitectSetup.sol";

contract DeployTownFactory is Deployer {
  DeployPioneer deployPioneer = new DeployPioneer();
  DeployTownOwner deployTownOwner = new DeployTownOwner();
  DeployTokenEntitlement deployTokenEntitlement = new DeployTokenEntitlement();
  DeployUserEntitlement deployUserEntitlement = new DeployUserEntitlement();
  DeployTown deployTown = new DeployTown();

  TownArchitectHelper townArchitectHelper = new TownArchitectHelper();
  ProxyManagerHelper proxyManagerHelper = new ProxyManagerHelper();
  PausableHelper pausableHelper = new PausableHelper();
  ERC721HolderHelper holderHelper = new ERC721HolderHelper();

  function versionName() public pure override returns (string memory) {
    return "townFactory";
  }

  function __deploy(uint256 deployerPK) public override returns (address) {
    address pioneer = deployPioneer.deploy();
    address townToken = deployTownOwner.deploy();

    vm.startBroadcast(deployerPK);
    address proxyManager = address(new ProxyManager());
    address pausable = address(new Pausable());
    address holder = address(new ERC721Holder());
    address architect = address(new TownArchitect());
    address init = address(new TownFactoryInit());
    address townFactory = address(new TownFactory());
    vm.stopBroadcast();

    info("ProxyManager Facet deployed at", proxyManager);
    info("Pausable Facet deployed at", pausable);
    info("ERC721Holder Facet deployed at", holder);
    info("TownArchitect Facet deployed at", architect);
    info("TownFactoryInit deployed at", init);

    TownFactoryInit.Args memory args = TownFactoryInit.Args({
      proxyImplementation: deployTown.deploy(),
      townToken: townToken,
      userEntitlementImplementation: deployUserEntitlement.deploy(),
      tokenEntitlementImplementation: deployTokenEntitlement.deploy()
    });

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](4);
    uint256 index;

    cuts[index++] = proxyManagerHelper.makeDeployCut(
      proxyManager,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = pausableHelper.makeDeployCut(
      pausable,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = holderHelper.makeDeployCut(
      holder,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = townArchitectHelper.makeDeployCut(
      architect,
      IDiamond.FacetCutAction.Add
    );

    vm.startBroadcast(deployerPK);
    IDiamondCut(townFactory).diamondCut(
      cuts,
      init,
      abi.encodeWithSelector(TownFactoryInit.init.selector, args)
    );
    TownOwner(townToken).setFactory(address(townFactory));
    TownArchitect(townFactory).gateByToken(pioneer, 1);
    vm.stopBroadcast();

    return townFactory;
  }
}
