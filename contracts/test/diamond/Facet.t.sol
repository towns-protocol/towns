// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

//libraries

//contracts

/// @notice This contract is abstract and must be inherited to be used in tests
abstract contract FacetTest is IDiamond, TestUtils {
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
}

abstract contract FacetHelper is IDiamond {
  bytes4[] public functionSelectors;

  /// @dev Deploy facet contract in constructor and return address for testing.
  function facet() public view virtual returns (address);

  function selectors() public virtual returns (bytes4[] memory);

  function initializer() public view virtual returns (bytes4);

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
