// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

//libraries

//contracts

/// @notice This contract is abstract and must be inherited to be used in tests
abstract contract FacetTest is IDiamond, TestUtils {
  uint256 index = 0;

  IDiamond.FacetCut[] internal _cuts;
  address[] internal _initAddresses;
  bytes[] internal _initDatas;

  address internal deployer;
  address internal diamond;

  function setUp() public virtual {
    deployer = getDeployer();

    vm.prank(deployer);
    diamond = address(new Diamond(diamondInitParams()));
  }

  function diamondInitParams()
    public
    virtual
    returns (Diamond.InitParams memory);

  function addInit(address initAddress, bytes memory initData) internal {
    _initAddresses.push(initAddress);
    _initDatas.push(initData);
  }

  function addCut(IDiamond.FacetCut memory cut) internal {
    _cuts.push(cut);
  }

  function addFacet(
    IDiamond.FacetCut memory cut,
    address initAddress,
    bytes memory initData
  ) internal {
    addCut(cut);
    addInit(initAddress, initData);
  }

  function baseFacets() internal view returns (IDiamond.FacetCut[] memory) {
    return _cuts;
  }

  function _resetIndex() internal {
    index = 0;
  }
}

abstract contract FacetHelper is IDiamond {
  bytes4[] public functionSelectors;
  uint256 internal _index;

  function initializer() public view virtual returns (bytes4) {
    return bytes4(0);
  }

  /// @dev Deploy facet contract in constructor and return address for testing.
  function facet() public view virtual returns (address) {
    return address(0);
  }

  function selectors() public virtual returns (bytes4[] memory) {
    return functionSelectors;
  }

  function makeCut(FacetCutAction action) public returns (FacetCut memory) {
    return
      FacetCut({
        action: action,
        facetAddress: facet(),
        functionSelectors: selectors()
      });
  }

  function makeCut(
    address facetAddress,
    FacetCutAction action
  ) public returns (FacetCut memory) {
    return
      FacetCut({
        action: action,
        facetAddress: facetAddress,
        functionSelectors: selectors()
      });
  }

  function makeInitData(
    bytes memory
  ) public view virtual returns (bytes memory data) {
    return abi.encodeWithSelector(initializer());
  }

  // =============================================================
  //                           Selector
  // =============================================================
  function addSelector(bytes4 selector) public {
    functionSelectors.push(selector);
  }

  function addSelectors(bytes4[] memory selectors_) public {
    for (uint256 i = 0; i < selectors_.length; i++) {
      functionSelectors.push(selectors_[i]);
    }
  }

  function removeSelector(bytes4 selector) public {
    for (uint256 i = 0; i < functionSelectors.length; i++) {
      if (functionSelectors[i] == selector) {
        functionSelectors[i] = functionSelectors[functionSelectors.length - 1];
        functionSelectors.pop();
        break;
      }
    }
  }
}
