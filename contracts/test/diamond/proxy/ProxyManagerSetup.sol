// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// contracts
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {ProxyManager} from "contracts/src/diamond/proxy/manager/ProxyManager.sol";
import {ManagedProxy} from "contracts/src/diamond/proxy/managed/ManagedProxy.sol";

// helpers
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {DiamondLoupeHelper} from "contracts/test/diamond/loupe/DiamondLoupeSetup.sol";
import {MockDiamondHelper} from "contracts/test/mocks/MockDiamond.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

abstract contract ProxyManagerSetup is FacetTest {
  address internal proxyOwner;

  ProxyManager internal proxyManager;
  ManagedProxy internal proxy;
  Diamond internal implementation;

  function setUp() public virtual override {
    super.setUp();

    proxyOwner = _randomAddress();
    proxyManager = ProxyManager(diamond);

    // Create a managed proxy
    // The owner of the managed proxy is a proxyOwner
    vm.prank(proxyOwner);
    proxy = new ManagedProxy(
      ProxyManager.getImplementation.selector,
      address(proxyManager)
    );
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    ProxyManagerHelper proxyManagerHelper = new ProxyManagerHelper();
    OwnableHelper ownableHelper = new OwnableHelper();
    DiamondLoupeHelper diamondLoupeHelper = new DiamondLoupeHelper();

    MultiInit multiInit = new MultiInit();

    // Create a mock implementation for the proxy manager to use
    // The owner of the implementation is the deployer
    MockDiamondHelper mockDiamondHelper = new MockDiamondHelper();
    implementation = mockDiamondHelper.createDiamond(deployer);

    // Create the facets for the proxy manager
    // The owner of the proxy manager is the deployer
    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](3);
    cuts[0] = proxyManagerHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[1] = ownableHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[2] = diamondLoupeHelper.makeCut(IDiamond.FacetCutAction.Add);

    address[] memory addresses = new address[](3);
    bytes[] memory payloads = new bytes[](3);

    addresses[0] = proxyManagerHelper.facet();
    addresses[1] = ownableHelper.facet();
    addresses[2] = diamondLoupeHelper.facet();

    payloads[0] = proxyManagerHelper.makeInitData(
      abi.encode(address(implementation))
    );
    payloads[1] = ownableHelper.makeInitData(abi.encode(address(deployer)));
    payloads[2] = diamondLoupeHelper.makeInitData("");

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

contract ProxyManagerHelper is FacetHelper {
  ProxyManager internal manager;

  constructor() {
    manager = new ProxyManager();
  }

  function facet() public view override returns (address) {
    return address(manager);
  }

  function selectors() public pure override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](2);
    selectors_[0] = ProxyManager.getImplementation.selector;
    selectors_[1] = ProxyManager.setImplementation.selector;
    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return ProxyManager.__ProxyManager_init.selector;
  }

  function makeInitData(
    bytes memory implementation
  ) public pure override returns (bytes memory) {
    return
      abi.encodeWithSelector(
        initializer(),
        abi.decode(implementation, (address))
      );
  }
}
