// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IWalletLink} from "contracts/src/river/wallet-link/IWalletLink.sol";

// libraries

// helpers
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {WalletLink} from "contracts/src/river/wallet-link/WalletLink.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

abstract contract WalletLinkSetup is FacetTest {
  WalletLink internal walletLink;

  function setUp() public override {
    super.setUp();
    walletLink = new WalletLink();
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    IntrospectionHelper introspectionHelper = new IntrospectionHelper();
    WalletLinkHelper walletLinkHelper = new WalletLinkHelper();
    MultiInit multiInit = new MultiInit();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](2);
    cuts[0] = introspectionHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[1] = walletLinkHelper.makeCut(IDiamond.FacetCutAction.Add);

    address[] memory addresses = new address[](2);
    addresses[0] = introspectionHelper.facet();
    addresses[1] = walletLinkHelper.facet();

    bytes[] memory datas = new bytes[](2);
    datas[0] = introspectionHelper.makeInitData("");
    datas[1] = walletLinkHelper.makeInitData("");

    return
      Diamond.InitParams({
        baseFacets: cuts,
        init: address(multiInit),
        initData: abi.encodeWithSelector(
          multiInit.multiInit.selector,
          addresses,
          datas
        )
      });
  }
}

contract WalletLinkHelper is FacetHelper {
  WalletLink internal walletLink;

  constructor() {
    walletLink = new WalletLink();
  }

  function facet() public view override returns (address) {
    return address(walletLink);
  }

  function selectors() public pure override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](6);
    uint256 idx;
    selectors_[idx++] = IWalletLink.linkWalletToRootKey.selector;
    selectors_[idx++] = IWalletLink.removeLink.selector;

    selectors_[idx++] = IWalletLink.getWalletsByRootKey.selector;
    selectors_[idx++] = IWalletLink.getRootKeyForWallet.selector;
    selectors_[idx++] = IWalletLink.checkIfLinked.selector;
    selectors_[idx++] = IWalletLink.getLatestNonceForRootKey.selector;
    return selectors_;
  }

  function initializer() public view override returns (bytes4) {
    return walletLink.__WalletLink_init.selector;
  }
}
