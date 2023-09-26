// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// contracts
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {AccessControlListFacet} from "contracts/src/node-network/acl/AccessControlListFacet.sol";
import {AccessControlListHelper} from "../acl/AccessControlListSetup.sol";

import {NodeRegistryFacet} from "contracts/src/node-network/registry/NodeRegistryFacet.sol";
import {NodeRegistryHelper} from "../registry/NodeRegistrySetup.sol";

import {ServiceStatusFacet, IServiceStatus} from "contracts/src/node-network/service-status/ServiceStatusFacet.sol";

abstract contract ServiceStatusSetup is FacetTest {
  ServiceStatusFacet internal serviceStatusFacet;
  AccessControlListFacet internal accessControlListFacet;
  NodeRegistryFacet internal nodeRegistryFacet;

  function setUp() public override {
    super.setUp();

    vm.prank(deployer);
    serviceStatusFacet = ServiceStatusFacet(diamond);
    accessControlListFacet = AccessControlListFacet(diamond);
    nodeRegistryFacet = NodeRegistryFacet(diamond);
    vm.stopPrank();
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    ServiceStatusHelper facetHelper = new ServiceStatusHelper();
    AccessControlListHelper accessControlListHelper = new AccessControlListHelper();
    NodeRegistryHelper nodeRegistryHelper = new NodeRegistryHelper();
    OwnableHelper ownableHelper = new OwnableHelper();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](4);
    cuts[0] = facetHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[1] = accessControlListHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[2] = ownableHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[3] = nodeRegistryHelper.makeCut(IDiamond.FacetCutAction.Add);

    return
      Diamond.InitParams({
        baseFacets: cuts,
        init: ownableHelper.facet(),
        initData: ownableHelper.makeInitData(abi.encode(address(deployer)))
      });
  }
}

contract ServiceStatusHelper is FacetHelper {
  ServiceStatusFacet internal nodeRegistry;

  constructor() {
    nodeRegistry = new ServiceStatusFacet();
  }

  function facet() public view override returns (address) {
    return address(nodeRegistry);
  }

  function selectors() public pure override returns (bytes4[] memory) {
    bytes4[] memory selector_ = new bytes4[](5);

    selector_[0] = IServiceStatus.signalIntentToEnter.selector;
    selector_[1] = IServiceStatus.signalIntentToActivate.selector;
    selector_[2] = IServiceStatus.signalIntentToCrash.selector;
    selector_[3] = IServiceStatus.signalIntentToExit.selector;
    selector_[4] = IServiceStatus.getServiceStatus.selector;
    return selector_;
  }

  function initializer() public pure override returns (bytes4) {
    return "";
  }
}
