// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

//interfaces
import {ITownArchitect} from "contracts/src/towns/facets/architect/ITownArchitect.sol";
import {IDiamondCut} from "contracts/src/diamond/extensions/cut/IDiamondCut.sol";
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";
import {IMockFacet} from "contracts/test/mocks/MockFacet.sol";

//libraries
import {Ownable__NotOwner} from "contracts/src/diamond/extensions/ownable/OwnableService.sol";

//contracts
import {MockFacetHelper} from "contracts/test/mocks/MockFacet.sol";
import {TownFactoryTest} from "contracts/test/towns/TownFactory.t.sol";
import {TownArchitect} from "contracts/src/towns/facets/architect/TownArchitect.sol";

contract TownDiamondCutTest is TownFactoryTest {
  MockFacetHelper internal mockFacetHelper;

  ITownArchitect internal townArchitect;
  IMockFacet internal mockFacet;

  function setUp() public override {
    super.setUp();

    mockFacetHelper = new MockFacetHelper();

    townArchitect = ITownArchitect(townFactory);
    mockFacet = IMockFacet(mockFacetHelper.facet());
  }

  function test_diamondCut_proxy_town() external {
    address founder = _randomAddress();

    // create facet selectors
    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
    cuts[0] = mockFacetHelper.makeCut(IDiamond.FacetCutAction.Add);

    vm.prank(founder);
    address proxyTown = _createSimpleTown("Proxy Town");

    vm.prank(founder);
    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, founder)
    );
    IDiamondCut(proxyTown).diamondCut(cuts, address(0), "");
  }

  function test_diamondCut_implementation_town() external {
    address founder = _randomAddress();

    vm.startPrank(founder);
    address proxyTown = _createSimpleTown("Proxy Town");
    address proxyTown2 = _createSimpleTown("Proxy Town 2");
    vm.stopPrank();

    // we call the getValue function on the proxy town, it should revert since it is not yet available on the implementation
    vm.expectRevert();
    IMockFacet(proxyTown).getValue();

    // we deploy the mock facet on the implementation
    // create facet selectors
    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
    cuts[0] = mockFacetHelper.makeCut(IDiamond.FacetCutAction.Add);

    vm.prank(deployer);
    IDiamondCut(town).diamondCut(cuts, address(0), "");

    // we call the getValue function on the proxy town, it should not revert since it is now available on the implementation
    assertEq(IMockFacet(proxyTown).getValue(), 0);
    assertEq(IMockFacet(proxyTown2).getValue(), 0);

    // we set the value on the proxy towns
    vm.startPrank(founder);
    IMockFacet(proxyTown).setValue(22);
    IMockFacet(proxyTown2).setValue(93);
    vm.stopPrank();

    assertEq(IMockFacet(proxyTown).getValue(), 22);
    assertEq(IMockFacet(proxyTown2).getValue(), 93);
  }
}
