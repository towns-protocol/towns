// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

//libraries

//contracts
import {DiamondDeployer} from "../common/DiamondDeployer.s.sol";
import {DeployDiamondCut} from "contracts/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "contracts/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "contracts/scripts/deployments/facets/DeployIntrospection.s.sol";

import {WalletLink} from "contracts/src/river/wallet-link/WalletLink.sol";

import {DiamondLoupeHelper} from "contracts/test/diamond/loupe/DiamondLoupeSetup.sol";
import {DiamondCutHelper} from "contracts/test/diamond/cut/DiamondCutSetup.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";
import {WalletLinkHelper} from "contracts/test/river/wallet-link/WalletLinkHelper.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

import {DeployMultiInit} from "contracts/scripts/deployments/DeployMultiInit.s.sol";

contract DeployWalletLink is DiamondDeployer {
  // deployments
  DeployDiamondCut deployDiamondCut = new DeployDiamondCut();
  DeployDiamondLoupe deployDiamondLoupe = new DeployDiamondLoupe();
  DeployIntrospection deployIntrospection = new DeployIntrospection();

  // helpers
  DiamondLoupeHelper diamondLoupeHelper = new DiamondLoupeHelper();
  DiamondCutHelper diamondCutHelper = new DiamondCutHelper();
  IntrospectionHelper introspectionHelper = new IntrospectionHelper();
  WalletLinkHelper walletLinkHelper = new WalletLinkHelper();

  // deployments
  DeployMultiInit deployMultiInit = new DeployMultiInit();

  address diamondLoupe;
  address diamondCut;
  address introspection;
  address walletLink;

  function versionName() public pure override returns (string memory) {
    return "walletLink";
  }

  function diamondInitParams(
    uint256 pk,
    address
  ) public override returns (Diamond.InitParams memory) {
    address multiInit = deployMultiInit.deploy();
    diamondCut = deployDiamondCut.deploy();
    diamondLoupe = deployDiamondLoupe.deploy();
    introspection = deployIntrospection.deploy();

    vm.startBroadcast(pk);
    walletLink = address(new WalletLink());
    vm.stopBroadcast();

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
      walletLinkHelper.makeCut(walletLink, IDiamond.FacetCutAction.Add),
      walletLink,
      walletLinkHelper.makeInitData("")
    );

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
}
