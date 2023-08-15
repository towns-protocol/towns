// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IDelegation} from "contracts/src/towns/facets/delegation/IDelegation.sol";

// libraries

// helpers
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {Delegation} from "contracts/src/towns/facets/delegation/Delegation.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

abstract contract DelegationSetup is FacetTest {
  Delegation internal delegation;

  function setUp() public override {
    super.setUp();
    delegation = new Delegation();
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    IntrospectionHelper introspectionHelper = new IntrospectionHelper();
    DelegationHelper delegationHelper = new DelegationHelper();
    MultiInit multiInit = new MultiInit();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](2);
    cuts[0] = introspectionHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[1] = delegationHelper.makeCut(IDiamond.FacetCutAction.Add);

    address[] memory addresses = new address[](2);
    addresses[0] = introspectionHelper.facet();
    addresses[1] = delegationHelper.facet();

    bytes[] memory datas = new bytes[](2);
    datas[0] = introspectionHelper.makeInitData("");
    datas[1] = delegationHelper.makeInitData("");

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

contract DelegationHelper is FacetHelper {
  Delegation internal delegation;

  constructor() {
    delegation = new Delegation();
  }

  function facet() public view override returns (address) {
    return address(delegation);
  }

  function selectors() public pure override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](4);
    selectors_[0] = IDelegation.delegateForAll.selector;
    selectors_[1] = IDelegation.getDelegationsByDelegate.selector;
    selectors_[2] = IDelegation.checkDelegateForAll.selector;
    selectors_[3] = IDelegation.getDelegatesForAll.selector;
    return selectors_;
  }

  function initializer() public view override returns (bytes4) {
    return delegation.__Delegation_init.selector;
  }
}
