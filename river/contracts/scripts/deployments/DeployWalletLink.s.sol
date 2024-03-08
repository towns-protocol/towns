// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

//libraries

//contracts
import {DiamondDeployer} from "../common/DiamondDeployer.s.sol";

import {DiamondLoupeFacet} from "contracts/src/diamond/facets/loupe/DiamondLoupeFacet.sol";
import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";
import {WalletLink} from "contracts/src/river/wallet-link/WalletLink.sol";

import {DiamondLoupeHelper} from "contracts/test/diamond/loupe/DiamondLoupeSetup.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";
import {WalletLinkHelper} from "contracts/test/river/wallet-link/WalletLinkSetup.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

import {DeployMultiInit} from "contracts/scripts/deployments/DeployMultiInit.s.sol";

contract DeployWalletLink is DiamondDeployer {
  DiamondLoupeHelper diamondLoupeHelper = new DiamondLoupeHelper();
  IntrospectionHelper introspectionHelper = new IntrospectionHelper();
  WalletLinkHelper walletLinkHelper = new WalletLinkHelper();

  // deployments
  DeployMultiInit deployMultiInit = new DeployMultiInit();

  address diamondLoupe;
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

    vm.startBroadcast(pk);
    diamondLoupe = address(new DiamondLoupeFacet());
    introspection = address(new IntrospectionFacet());
    walletLink = address(new WalletLink());
    vm.stopBroadcast();

    uint256 facetCount = 3;

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](facetCount);

    cuts[index++] = diamondLoupeHelper.makeCut(
      diamondLoupe,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = introspectionHelper.makeCut(
      introspection,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = walletLinkHelper.makeCut(
      walletLink,
      IDiamond.FacetCutAction.Add
    );

    _resetIndex();

    address[] memory addresses = new address[](facetCount);
    addresses[index++] = diamondLoupe;
    addresses[index++] = introspection;
    addresses[index++] = walletLink;

    _resetIndex();

    bytes[] memory data = new bytes[](facetCount);

    data[index++] = diamondLoupeHelper.makeInitData("");
    data[index++] = introspectionHelper.makeInitData("");
    data[index++] = walletLinkHelper.makeInitData("");

    return
      Diamond.InitParams({
        baseFacets: cuts,
        init: multiInit,
        initData: abi.encodeWithSelector(
          MultiInit.multiInit.selector,
          addresses,
          data
        )
      });
  }
}
