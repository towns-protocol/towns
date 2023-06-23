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
import {MockDiamondProxy} from "contracts/test/mocks/MockDiamondProxy.sol";
import {MockFacetHelper, IMockFacet} from "contracts/test/mocks/MockFacet.sol";

// utils
import {console} from "forge-std/console.sol";

contract DiamondProxyTest is DiamondBaseSetup {
  address internal diamondProxy;

  function setUp() external {}

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
    diamondProxy = address(new MockDiamondProxy(diamond));

    assertEq(IMockFacet(diamondProxy).mockFunction(), 42);
  }
}
