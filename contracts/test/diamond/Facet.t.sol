// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

//libraries

//contracts

/// @notice This contract is abstract and must be inherited to be used in tests
abstract contract FacetTest is TestUtils, IDiamond {
  address internal deployer;
  address internal diamond;

  function setUp() public virtual {
    deployer = _randomAddress();

    vm.prank(deployer);
    diamond = address(new Diamond(diamondInitParams()));
  }

  function diamondInitParams()
    public
    virtual
    returns (Diamond.InitParams memory);
}

abstract contract FacetHelper is IDiamond {
  /// @dev Deploy facet contract in constructor and return address for testing.
  function facet() public view virtual returns (address);

  function selectors() public view virtual returns (bytes4[] memory);

  function initializer() public view virtual returns (bytes4);

  function makeCut(
    FacetCutAction action
  ) public view returns (FacetCut memory) {
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
  ) public view returns (FacetCut memory) {
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
}
