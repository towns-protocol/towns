// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";
import {IDiamondCut} from "contracts/src/diamond/extensions/cut/IDiamondCut.sol";
import {IERC173} from "contracts/src/diamond/extensions/ownable/IERC173.sol";
import {IProxyManager} from "contracts/src/diamond/proxy/manager/IProxyManager.sol";

// libraries

// contracts
import {FacetTest} from "contracts/test/diamond/Facet.t.sol";

// mocks
import {MockManagedProxy} from "contracts/test/mocks/MockManagedProxy.sol";
import {MockFacetHelper, IMockFacet} from "contracts/test/mocks/MockFacet.sol";
import {MockProxyManager} from "contracts/test/mocks/MockProxyManager.sol";
import {MockDiamond} from "contracts/test/mocks/MockDiamond.sol";

contract ManagedProxyTest is FacetTest {
  address internal registry;
  address internal implementation;
  address internal proxy;
  address internal owner;

  function setUp() public override {
    super.setUp();

    owner = _randomAddress();

    // deploy proxy manager with diamond as implementation
    registry = address(new MockProxyManager());
    MockProxyManager(registry).init(diamond);

    vm.stopPrank();

    // deploy proxy with getImplementation function and registry as manager
    vm.prank(owner);
    proxy = address(
      new MockManagedProxy(IProxyManager.getImplementation.selector, registry)
    );
  }

  // =============================================================
  //                           Registry
  // =============================================================

  function test_registry_init() external {
    vm.prank(owner);
    registry = address(new MockProxyManager());
    MockProxyManager(registry).init(diamond);
  }

  function test_registry_setImplementation() external {
    address newDiamond = address(new MockDiamond());

    vm.prank(deployer);
    MockProxyManager(registry).setImplementation(newDiamond);

    assertEq(
      MockProxyManager(registry).getImplementation(
        IProxyManager.getImplementation.selector
      ),
      newDiamond
    );
  }

  // =============================================================
  //                    Proxy Manager Changes
  // =============================================================

  function test_proxy_init() external {
    vm.prank(owner);
    MockManagedProxy(payable(proxy)).init(
      IProxyManager.getImplementation.selector,
      registry
    );
  }

  function test_proxy_setManager() external {
    vm.prank(owner);
    MockManagedProxy(payable(proxy)).setManager(_randomAddress());
  }

  function test_proxy_setManagerSelector() external {
    vm.prank(owner);
    MockManagedProxy(payable(proxy)).setManagerSelector(
      IProxyManager.getImplementation.selector
    );
  }

  // =============================================================
  //                           Proxy
  // =============================================================

  function test_proxy_owner() external {
    assertEq(IERC173(proxy).owner(), owner);
  }

  function test_proxy_contains_global_cuts() external {
    MockFacetHelper mockFacet = new MockFacetHelper();
    IDiamond.FacetCut[] memory extensions = new IDiamond.FacetCut[](1);
    extensions[0] = IDiamond.FacetCut({
      facetAddress: mockFacet.facet(),
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: mockFacet.selectors()
    });

    vm.prank(deployer);
    IDiamondCut(diamond).diamondCut(extensions, address(0), "");

    IMockFacet(proxy).mockFunction();
  }

  function test_proxy_add_custom_cuts() external {
    // add some facets to diamond
    MockFacetHelper mockFacet = new MockFacetHelper();
    IDiamond.FacetCut[] memory extensions = new IDiamond.FacetCut[](1);
    extensions[0] = IDiamond.FacetCut({
      facetAddress: mockFacet.facet(),
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: mockFacet.selectors()
    });

    vm.prank(owner);
    IDiamondCut(proxy).diamondCut(extensions, address(0), "");

    // assert facet function is callable from proxy
    IMockFacet(proxy).mockFunction();

    // assert facet function is not callable from diamond
    vm.expectRevert();
    IMockFacet(diamond).mockFunction();
  }
}
