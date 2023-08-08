// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

//interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";
import {IDiamondLoupe} from "contracts/src/diamond/facets/loupe/IDiamondLoupe.sol";
import {IERC165} from "contracts/src/diamond/facets/introspection/IERC165.sol";

//libraries

//contracts
import {DiamondLoupeSetup} from "./DiamondLoupeSetup.sol";
import {MockFacetHelper} from "contracts/test/mocks/MockFacet.sol";
import {MockFacet} from "contracts/test/mocks/MockFacet.sol";

contract DiamondLoupeTest is DiamondLoupeSetup {
  IDiamond.FacetCut[] internal facetCuts;
  MockFacetHelper internal mockFacetHelper = new MockFacetHelper();

  function test_supportsInterface() external {
    assertTrue(
      IERC165(diamond).supportsInterface(type(IDiamondLoupe).interfaceId)
    );
  }

  function test_facets() external {
    bytes4[] memory expectedSelectors = mockFacetHelper.selectors();
    IDiamondLoupe.Facet[] memory currentFacets = diamondLoupe.facets();

    // create facet cuts
    IDiamond.FacetCut[] memory extensions = new IDiamond.FacetCut[](1);
    extensions[0] = IDiamond.FacetCut({
      facetAddress: mockFacetHelper.facet(),
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: expectedSelectors
    });

    // cut diamond
    diamondCut.diamondCut(extensions, address(0), "");

    // get facets
    IDiamondLoupe.Facet[] memory facets = diamondLoupe.facets();

    // assert facets length is correct
    assertEq(facets.length, currentFacets.length + 1);
  }

  function test_facetFunctionSelectors() external {
    bytes4[] memory expectedSelectors = mockFacetHelper.selectors();

    // create facet cuts
    IDiamond.FacetCut[] memory extensions = new IDiamond.FacetCut[](1);
    extensions[0] = IDiamond.FacetCut({
      facetAddress: mockFacetHelper.facet(),
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: expectedSelectors
    });

    // cut diamond
    diamondCut.diamondCut(extensions, address(0), "");

    // get facet selectors
    bytes4[] memory selectors = diamondLoupe.facetFunctionSelectors(
      mockFacetHelper.facet()
    );

    // assert selectors length is correct
    assertEq(selectors.length, expectedSelectors.length);

    // loop through selectors
    for (uint256 i; i < selectors.length; i++) {
      // assert selector is correct
      assertEq(selectors[i], expectedSelectors[i]);
    }
  }

  function test_facetAddresses() external {
    bytes4[] memory expectedSelectors = mockFacetHelper.selectors();
    address[] memory currentFacetAddresses = diamondLoupe.facetAddresses();

    // create facet cuts
    IDiamond.FacetCut[] memory extensions = new IDiamond.FacetCut[](1);
    extensions[0] = IDiamond.FacetCut({
      facetAddress: mockFacetHelper.facet(),
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: expectedSelectors
    });

    // cut diamond
    diamondCut.diamondCut(extensions, address(0), "");

    // get facet addresses
    address[] memory facetAddresses = diamondLoupe.facetAddresses();

    // assert facet addresses length is correct
    assertEq(facetAddresses.length, currentFacetAddresses.length + 1);

    // assert facet address is correct
    assertEq(
      facetAddresses[facetAddresses.length - 1],
      mockFacetHelper.facet()
    );
  }

  function test_facetAddress() external {
    bytes4[] memory expectedSelectors = mockFacetHelper.selectors();

    // create facet cuts
    IDiamond.FacetCut[] memory extensions = new IDiamond.FacetCut[](1);
    extensions[0] = IDiamond.FacetCut({
      facetAddress: mockFacetHelper.facet(),
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: expectedSelectors
    });

    // cut diamond
    diamondCut.diamondCut(extensions, address(0), "");

    // loop through mock facet selectors
    for (uint256 i; i < expectedSelectors.length; i++) {
      // assert facet address is correct
      assertEq(
        diamondLoupe.facetAddress(expectedSelectors[i]),
        mockFacetHelper.facet()
      );
    }
  }

  function test_facetAddressRemove() external {
    bytes4[] memory expectedSelectors = mockFacetHelper.selectors();

    // create facet cuts
    IDiamond.FacetCut[] memory extensions = new IDiamond.FacetCut[](1);
    extensions[0] = IDiamond.FacetCut({
      facetAddress: mockFacetHelper.facet(),
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: expectedSelectors
    });

    // cut diamond
    diamondCut.diamondCut(extensions, address(0), "");

    // remove facet cuts
    extensions[0] = IDiamond.FacetCut({
      facetAddress: mockFacetHelper.facet(),
      action: IDiamond.FacetCutAction.Remove,
      functionSelectors: expectedSelectors
    });

    // cut diamond
    diamondCut.diamondCut(extensions, address(0), "");

    // loop through mock facet selectors
    for (uint256 i; i < expectedSelectors.length; i++) {
      // assert facet address is correct
      assertEq(diamondLoupe.facetAddress(expectedSelectors[i]), address(0));
    }
  }

  function test_facetAddressReplace() external {
    bytes4[] memory expectedSelectors = mockFacetHelper.selectors();

    // create facet cuts
    IDiamond.FacetCut[] memory extensions = new IDiamond.FacetCut[](1);
    extensions[0] = IDiamond.FacetCut({
      facetAddress: mockFacetHelper.facet(),
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: expectedSelectors
    });

    // cut diamond
    diamondCut.diamondCut(extensions, address(0), "");

    address expectedFacetAddress = address(new MockFacet());

    // create facet cuts
    extensions[0] = IDiamond.FacetCut({
      facetAddress: expectedFacetAddress,
      action: IDiamond.FacetCutAction.Replace,
      functionSelectors: expectedSelectors
    });

    // cut diamond
    diamondCut.diamondCut(extensions, address(0), "");

    // loop through mock facet selectors
    for (uint256 i; i < expectedSelectors.length; i++) {
      // assert facet address is correct
      assertEq(
        diamondLoupe.facetAddress(expectedSelectors[i]),
        expectedFacetAddress
      );
    }
  }
}
