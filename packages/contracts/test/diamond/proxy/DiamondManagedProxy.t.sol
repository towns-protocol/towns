// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";
import {IDiamondCut} from "contracts/src/diamond/extensions/cut/IDiamondCut.sol";
import {IDiamondLoupe} from "contracts/src/diamond/extensions/loupe/IDiamondLoupe.sol";
import {IERC173} from "contracts/src/diamond/extensions/ownable/IERC173.sol";

// libraries

// contracts
import {DiamondBaseSetup} from "contracts/test/diamond/DiamondBaseSetup.sol";

// mocks
import {MockDiamondManagedProxy} from "contracts/test/mocks/MockDiamondManagedProxy.sol";
import {MockDiamondRegistry} from "contracts/test/mocks/MockDiamondRegistry.sol";
import {MockFacetHelper, IMockFacet} from "contracts/test/mocks/MockFacet.sol";

// utils
import {console} from "forge-std/console.sol";

contract DiamondManagedProxyTest is DiamondBaseSetup {
  address internal registry;
  address internal implementation;
  address internal proxy;
  address internal user;

  function setUp() external {
    user = _randomAddress();
    registry = address(new MockDiamondRegistry(diamond));
    vm.stopPrank();

    vm.prank(user);
    proxy = address(
      new MockDiamondManagedProxy(
        registry,
        MockDiamondRegistry.getImplementation.selector
      )
    );
  }

  function test_proxyIsRoutingToImplementation() external {
    assertEq(IERC173(proxy).owner(), user);
  }

  function test_proxyHasNewImplementationFacets() external {
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

  function test_proxyHasNewCuts() external {
    // add some facets to diamond
    MockFacetHelper mockFacet = new MockFacetHelper();
    IDiamond.FacetCut[] memory extensions = new IDiamond.FacetCut[](1);
    extensions[0] = IDiamond.FacetCut({
      facetAddress: mockFacet.facet(),
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: mockFacet.selectors()
    });

    vm.prank(user);
    IDiamondCut(proxy).diamondCut(extensions, address(0), "");

    // assert facet function is callable from proxy
    IMockFacet(proxy).mockFunction();

    // assert facet function is not callable from diamond
    vm.expectRevert();
    IMockFacet(diamond).mockFunction();
  }
}
