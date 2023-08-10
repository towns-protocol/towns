// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IDiamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";
import {IERC173} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {IProxyManager} from "contracts/src/diamond/proxy/manager/IProxyManager.sol";

// libraries

// contracts
import {ProxyManagerSetup} from "contracts/test/diamond/proxy/ProxyManagerSetup.sol";

// mocks
import {MockFacetHelper, IMockFacet} from "contracts/test/mocks/MockFacet.sol";
import {MockDiamondHelper} from "contracts/test/mocks/MockDiamond.sol";

contract ProxyManagerTest is ProxyManagerSetup {
  // =============================================================
  //                          Proxy Manager
  // =============================================================

  /// @notice This test creates a new implementation and sets it as the implementation for the proxy manager
  function test_manager_setImplementation() external {
    // create a new implementation
    MockDiamondHelper mockDiamondHelper = new MockDiamondHelper();
    address implementation = address(mockDiamondHelper.createDiamond(deployer));

    // update the implementation to be something else in our proxy manager
    vm.prank(deployer);
    proxyManager.setImplementation(implementation);

    assertEq(
      proxyManager.getImplementation(IProxyManager.getImplementation.selector),
      implementation
    );
  }

  // =============================================================
  //                           Proxy
  // =============================================================

  /// @notice This test checks that the owner of the proxy is different from the owner of the implementation
  function test_proxy_owner() external {
    assertEq(IERC173(address(implementation)).owner(), deployer);
    assertEq(IERC173(address(proxy)).owner(), proxyOwner);
  }

  /// @notice This test adds a new facet to our implementation, which means our proxy should now have access to it as well
  function test_proxy_contains_global_cuts() external {
    MockFacetHelper mockFacet = new MockFacetHelper();
    IDiamond.FacetCut[] memory extensions = new IDiamond.FacetCut[](1);
    extensions[0] = IDiamond.FacetCut({
      facetAddress: mockFacet.facet(),
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: mockFacet.selectors()
    });

    vm.prank(deployer);
    IDiamondCut(address(implementation)).diamondCut(extensions, address(0), "");

    assertEq(IMockFacet(address(proxy)).mockFunction(), 42);
  }

  /// @notice This test adds a new facet to our proxy, which means our implementation should not have access to it
  function test_proxy_add_custom_cuts() external {
    // add some facets to diamond
    MockFacetHelper mockFacet = new MockFacetHelper();
    IDiamond.FacetCut[] memory extensions = new IDiamond.FacetCut[](1);
    extensions[0] = IDiamond.FacetCut({
      facetAddress: mockFacet.facet(),
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: mockFacet.selectors()
    });

    vm.prank(proxyOwner);
    IDiamondCut(address(proxy)).diamondCut(extensions, address(0), "");

    // assert facet function is callable from proxy
    IMockFacet(address(proxy)).mockFunction();

    // assert facet function is not callable from implementation
    vm.expectRevert();
    IMockFacet(address(implementation)).mockFunction();
  }
}
