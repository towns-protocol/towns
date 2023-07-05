// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";

// libraries

// contracts
import {FacetTest} from "contracts/test/diamond/Facet.t.sol";

// mocks
import {MockProxy} from "contracts/test/mocks/MockProxy.sol";
import {MockFacetHelper, IMockFacet} from "contracts/test/mocks/MockFacet.sol";

contract ProxyTest is FacetTest {
  address internal diamondProxy;

  function test_proxyHasNewCuts() external {
    // add some facets to diamond
    MockFacetHelper mockFacet = new MockFacetHelper();
    IDiamond.FacetCut[] memory extensions = new IDiamond.FacetCut[](1);
    extensions[0] = IDiamond.FacetCut({
      facetAddress: mockFacet.facet(),
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: mockFacet.selectors()
    });

    IDiamondCut(diamond).diamondCut(extensions, address(0), "");

    vm.stopPrank();

    address user1 = _randomAddress();
    vm.prank(user1);
    diamondProxy = address(new MockProxy(diamond));

    assertEq(IMockFacet(diamondProxy).mockFunction(), 42);
  }
}
