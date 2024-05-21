// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// helpers
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";
import {ERC721AHelper} from "contracts/test/diamond/erc721a/ERC721ASetup.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

// contracts
import {ERC5643Mock} from "contracts/test/mocks/MockERC5643.sol";
import {ERC5643} from "contracts/src/diamond/facets/token/ERC5643/ERC5643.sol";

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
    ERC5643MockHelper erc5643MockHelper = new ERC5643MockHelper();
    IntrospectionHelper introspectionHelper = new IntrospectionHelper();
    ERC721AHelper erc721aHelper = new ERC721AHelper();
    MultiInit multiInit = new MultiInit();

    erc5643MockHelper.addSelectors(erc5643Helper.selectors());

    address[] memory addresses = new address[](3);
    bytes[] memory payloads = new bytes[](3);

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](3);

    cuts[0] = erc5643MockHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[1] = introspectionHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[2] = erc721aHelper.makeCut(IDiamond.FacetCutAction.Add);

    addresses[0] = erc5643MockHelper.facet();
    addresses[1] = introspectionHelper.facet();
    addresses[2] = erc721aHelper.facet();

    payloads[0] = erc5643MockHelper.makeInitData("");
    payloads[1] = introspectionHelper.makeInitData("");
    payloads[2] = erc721aHelper.makeInitData("My NFT", "MNFT");

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
  ERC5643 internal subscription;

  constructor() {
    subscription = new ERC5643();

    bytes4[] memory selectors_ = new bytes4[](4);
    selectors_[0] = subscription.renewSubscription.selector;
    selectors_[1] = subscription.cancelSubscription.selector;
    selectors_[2] = subscription.expiresAt.selector;
    selectors_[3] = subscription.isRenewable.selector;
    addSelectors(selectors_);
  }

  function facet() public view virtual override returns (address) {
    return address(subscription);
  }

  function initializer() public view virtual override returns (bytes4) {
    return ERC5643.__ERC5643_init.selector;
  }

  function selectors() public view virtual override returns (bytes4[] memory) {
    return functionSelectors;
  }
}

contract ERC5643MockHelper is FacetHelper {
  ERC5643Mock internal mock;

  constructor() {
    mock = new ERC5643Mock();
    addSelector(mock.mintTo.selector);
  }

  function facet() public view override returns (address) {
    return address(mock);
  }

  function selectors() public view override returns (bytes4[] memory) {
    return functionSelectors;
  }

  function initializer() public view virtual override returns (bytes4) {
    return ERC5643.__ERC5643_init.selector;
  }
}
