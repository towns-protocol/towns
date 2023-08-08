// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IDiamondCutBase} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut, IDiamondCutBase} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";
import {IERC165} from "openzeppelin-contracts/contracts/utils/introspection/IERC165.sol";
import {IMockFacet} from "contracts/test/mocks/MockFacet.sol";
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";

// libraries

// contracts
import {DiamondCutSetup} from "contracts/test/diamond/cut/DiamondCutSetup.sol";

contract DiamondCutTest is DiamondCutSetup, IDiamondCutBase, IOwnableBase {
  IDiamond.FacetCut[] internal facetCuts;

  function test_supportsInterface() external {
    assertTrue(
      IERC165(diamond).supportsInterface(type(IDiamondCut).interfaceId)
    );
  }

  function test_diamondCut() external {
    // create facet selectors
    bytes4[] memory facetSelectors = new bytes4[](1);
    facetSelectors[0] = mockFacet.mockFunction.selector;
    // create facet cuts
    IDiamond.FacetCut[] memory extensions = new IDiamond.FacetCut[](1);
    extensions[0] = IDiamond.FacetCut({
      facetAddress: address(mockFacet),
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: facetSelectors
    });
    vm.expectEmit(true, true, true, true, diamond);
    emit DiamondCut(extensions, address(0), "");
    // cut diamond
    diamondCut.diamondCut(extensions, address(0), "");
    // assert facet function is callable
    assertEq(IMockFacet(diamond).mockFunction(), 42);
  }

  function test_diamondCut_reverts_when_not_owner() external {
    vm.stopPrank();
    // create facet selectors
    bytes4[] memory facetSelectors = new bytes4[](1);
    facetSelectors[0] = mockFacet.mockFunction.selector;

    // create facet cuts
    IDiamond.FacetCut[] memory extensions = new IDiamond.FacetCut[](1);
    extensions[0] = IDiamond.FacetCut({
      facetAddress: address(mockFacet),
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: facetSelectors
    });

    address caller = _randomAddress();
    vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, caller));
    vm.prank(caller);
    diamondCut.diamondCut(extensions, address(0), "");
  }

  function test_reverts_when_init_not_contract() external {
    address init = _randomAddress();
    // create facet selectors
    bytes4[] memory facetSelectors = new bytes4[](1);
    facetSelectors[0] = mockFacet.mockFunction.selector;
    // create facet cuts
    IDiamond.FacetCut[] memory extensions = new IDiamond.FacetCut[](1);
    extensions[0] = IDiamond.FacetCut({
      facetAddress: address(mockFacet),
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: facetSelectors
    });
    vm.expectRevert(
      abi.encodeWithSelector(DiamondCut_InvalidContract.selector, init)
    );
    diamondCut.diamondCut(extensions, init, "");
  }

  function test_revertWhenFacetIsZeroAddress() external {
    facetCuts.push(
      IDiamond.FacetCut({
        facetAddress: address(0),
        action: IDiamond.FacetCutAction.Add,
        functionSelectors: new bytes4[](0)
      })
    );
    vm.expectRevert(
      abi.encodeWithSelector(DiamondCut_InvalidFacet.selector, address(0))
    );
    diamondCut.diamondCut(facetCuts, address(0), "");
  }

  function test_revertsWhenFacetIsNotContract() external {
    address facet = _randomAddress();
    facetCuts.push(
      IDiamond.FacetCut({
        facetAddress: facet,
        action: IDiamond.FacetCutAction.Add,
        functionSelectors: new bytes4[](0)
      })
    );
    vm.expectRevert(
      abi.encodeWithSelector(DiamondCut_InvalidFacet.selector, facet)
    );
    diamondCut.diamondCut(facetCuts, address(0), "");
  }

  function test_revertsWhenSelectorArrayIsEmpty() external {
    facetCuts.push(
      IDiamond.FacetCut({
        facetAddress: address(mockFacet),
        action: IDiamond.FacetCutAction.Add,
        functionSelectors: new bytes4[](0)
      })
    );
    vm.expectRevert(
      abi.encodeWithSelector(
        DiamondCut_InvalidFacetSelectors.selector,
        address(mockFacet)
      )
    );
    diamondCut.diamondCut(facetCuts, address(0), "");
  }

  // =============================================================
  //                           Add Facet
  // =============================================================
  function test_revertWhenAddingFunctionAlreadyExists() external {
    bytes4[] memory facetSelectors = new bytes4[](1);
    facetSelectors[0] = mockFacet.mockFunction.selector;
    facetCuts.push(
      IDiamond.FacetCut({
        facetAddress: address(mockFacet),
        action: IDiamond.FacetCutAction.Add,
        functionSelectors: facetSelectors
      })
    );
    diamondCut.diamondCut(facetCuts, address(0), "");
    vm.expectRevert(
      abi.encodeWithSelector(
        DiamondCut_FunctionAlreadyExists.selector,
        facetSelectors[0]
      )
    );
    diamondCut.diamondCut(facetCuts, address(0), "");
  }

  function test_revertWhenAddingZeroSelector() external {
    bytes4[] memory facetSelectors = new bytes4[](1);
    facetSelectors[0] = bytes4(0);
    facetCuts.push(
      IDiamond.FacetCut({
        facetAddress: address(mockFacet),
        action: IDiamond.FacetCutAction.Add,
        functionSelectors: facetSelectors
      })
    );
    vm.expectRevert(DiamondCut_InvalidSelector.selector);
    diamondCut.diamondCut(facetCuts, address(0), "");
  }

  // =============================================================
  //                        Remove Facet
  // =============================================================
  function test_revertWhenRemovingFromOtherFacet() external {
    // create facet selectors
    bytes4[] memory facetSelectors = new bytes4[](1);
    facetSelectors[0] = mockFacet.mockFunction.selector;
    // create facet cuts
    IDiamond.FacetCut[] memory extensions = new IDiamond.FacetCut[](1);
    extensions[0] = IDiamond.FacetCut({
      facetAddress: address(mockFacet),
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: facetSelectors
    });
    // cut diamond
    diamondCut.diamondCut(extensions, address(0), "");
    facetSelectors = new bytes4[](1);
    facetSelectors[0] = 0x12345678;
    facetCuts.push(
      IDiamond.FacetCut({
        facetAddress: address(mockFacet),
        action: IDiamond.FacetCutAction.Remove,
        functionSelectors: facetSelectors
      })
    );
    vm.expectRevert(
      abi.encodeWithSelector(
        DiamondCut_InvalidFacetRemoval.selector,
        address(mockFacet),
        facetSelectors[0]
      )
    );
    diamondCut.diamondCut(facetCuts, address(0), "");
  }

  function test_revertWhenRemovingZeroSelector() external {
    // create facet selectors
    bytes4[] memory facetSelectors = new bytes4[](1);
    facetSelectors[0] = mockFacet.mockFunction.selector;
    // create facet cuts
    IDiamond.FacetCut[] memory extensions = new IDiamond.FacetCut[](1);
    extensions[0] = IDiamond.FacetCut({
      facetAddress: address(mockFacet),
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: facetSelectors
    });
    // cut diamond
    diamondCut.diamondCut(extensions, address(0), "");
    facetSelectors = new bytes4[](1);
    facetSelectors[0] = bytes4(0);
    facetCuts.push(
      IDiamond.FacetCut({
        facetAddress: address(mockFacet),
        action: IDiamond.FacetCutAction.Remove,
        functionSelectors: facetSelectors
      })
    );
    vm.expectRevert(DiamondCut_InvalidSelector.selector);
    diamondCut.diamondCut(facetCuts, address(0), "");
  }

  function test_revertWhenRemovingImmutableSelector() external {
    facetCuts.push(
      IDiamond.FacetCut({
        facetAddress: address(diamond),
        action: IDiamond.FacetCutAction.Remove,
        functionSelectors: new bytes4[](1)
      })
    );
    vm.expectRevert(DiamondCut_ImmutableFacet.selector);
    diamondCut.diamondCut(facetCuts, address(0), "");
  }

  // =============================================================
  //                        Replace Facet
  // =============================================================
  function test_revertWhenReplacingZeroSelector() external {
    bytes4[] memory facetSelectors = new bytes4[](1);
    facetSelectors[0] = bytes4(0);
    facetCuts.push(
      IDiamond.FacetCut({
        facetAddress: address(mockFacet),
        action: IDiamond.FacetCutAction.Replace,
        functionSelectors: facetSelectors
      })
    );
    vm.expectRevert(DiamondCut_InvalidSelector.selector);
    diamondCut.diamondCut(facetCuts, address(0), "");
  }

  function test_revertWhenReplacingFunctionFromSameFacet() external {
    bytes4[] memory facetSelectors = new bytes4[](1);
    facetSelectors[0] = mockFacet.mockFunction.selector;
    facetCuts.push(
      IDiamond.FacetCut({
        facetAddress: address(mockFacet),
        action: IDiamond.FacetCutAction.Add,
        functionSelectors: facetSelectors
      })
    );
    facetCuts.push(
      IDiamond.FacetCut({
        facetAddress: address(mockFacet),
        action: IDiamond.FacetCutAction.Replace,
        functionSelectors: facetSelectors
      })
    );
    vm.expectRevert(
      abi.encodeWithSelector(
        DiamondCut_FunctionFromSameFacetAlreadyExists.selector,
        facetSelectors[0]
      )
    );
    diamondCut.diamondCut(facetCuts, address(0), "");
  }

  function test_revertWhenReplacingImmutableFunction() external {
    bytes4[] memory facetSelectors = new bytes4[](1);
    facetSelectors[0] = mockFacet.mockFunction.selector;
    facetCuts.push(
      IDiamond.FacetCut({
        facetAddress: address(diamond),
        action: IDiamond.FacetCutAction.Replace,
        functionSelectors: facetSelectors
      })
    );
    vm.expectRevert(DiamondCut_ImmutableFacet.selector);
    diamondCut.diamondCut(facetCuts, address(0), "");
  }
}
