// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";

import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";
import {WalletLink} from "contracts/src/river/wallet-link/WalletLink.sol";

import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";
import {WalletLinkHelper} from "contracts/test/river/wallet-link/WalletLinkSetup.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

contract DeployWalletLink is Deployer {
  IntrospectionHelper introspectionHelper = new IntrospectionHelper();
  WalletLinkHelper walletLinkHelper = new WalletLinkHelper();

  address introspection;
  address walletLink;
  address multiInit;

  function versionName() public pure override returns (string memory) {
    return "walletLink";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.startBroadcast(deployerPK);
    introspection = address(new IntrospectionFacet());
    walletLink = address(new WalletLink());
    multiInit = address(new MultiInit());
    vm.stopBroadcast();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](2);
    uint256 index;

    cuts[index++] = introspectionHelper.makeCut(
      introspection,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = walletLinkHelper.makeCut(
      walletLink,
      IDiamond.FacetCutAction.Add
    );

    address[] memory addresses = new address[](2);
    addresses[0] = introspection;
    addresses[1] = walletLink;

    bytes[] memory datas = new bytes[](2);
    datas[0] = introspectionHelper.makeInitData("");
    datas[1] = walletLinkHelper.makeInitData("");

    vm.startBroadcast(deployerPK);
    address walletLinkAddress = address(
      new Diamond(
        Diamond.InitParams({
          baseFacets: cuts,
          init: multiInit,
          initData: abi.encodeWithSelector(
            MultiInit.multiInit.selector,
            addresses,
            datas
          )
        })
      )
    );
    vm.stopBroadcast();

    return walletLinkAddress;
  }
}
