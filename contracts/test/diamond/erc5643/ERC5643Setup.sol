// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// helpers
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

// contracts
import {ERC5643Mock} from "contracts/test/mocks/MockERC5643.sol";

abstract contract ERC5643Setup is FacetTest {
  ERC5643Mock internal subscription;

  function setUp() public override {
    super.setUp();
    subscription = ERC5643Mock(diamond);
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    ERC5643Helper erc5643Helper = new ERC5643Helper();
    IntrospectionHelper introspectionHelper = new IntrospectionHelper();
    MultiInit multiInit = new MultiInit();

    address[] memory addresses = new address[](2);
    bytes[] memory payloads = new bytes[](2);

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](2);

    cuts[0] = erc5643Helper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[1] = introspectionHelper.makeCut(IDiamond.FacetCutAction.Add);

    addresses[0] = erc5643Helper.facet();
    addresses[1] = introspectionHelper.facet();

    payloads[0] = erc5643Helper.makeInitData("");
    payloads[1] = introspectionHelper.makeInitData("");

    return
      Diamond.InitParams({
        baseFacets: cuts,
        init: address(multiInit),
        initData: abi.encodeWithSelector(
          multiInit.multiInit.selector,
          addresses,
          payloads
        )
      });
  }
}

contract ERC5643Helper is FacetHelper {
  ERC5643Mock internal subscription;

  constructor() {
    subscription = new ERC5643Mock();
  }

  function facet() public view override returns (address) {
    return address(subscription);
  }

  function initializer() public view override returns (bytes4) {
    return subscription.init.selector;
  }

  function selectors() public view override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](8);

    selectors_[0] = subscription.renewSubscription.selector;
    selectors_[1] = subscription.cancelSubscription.selector;
    selectors_[2] = subscription.expiresAt.selector;
    selectors_[3] = subscription.isRenewable.selector;

    // ERC721
    selectors_[4] = subscription.mintTo.selector;
    selectors_[5] = subscription.ownerOf.selector;
    selectors_[6] = subscription.balanceOf.selector;
    selectors_[7] = subscription.setApprovalForAll.selector;

    return selectors_;
  }
}
