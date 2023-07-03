// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

//interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";

//libraries

//contracts
import {MockDiamond} from "contracts/test/mocks/MockDiamond.sol";

/// @notice This contract is abstract and must be inherited to be used in tests
abstract contract FacetTest is TestUtils {
  address internal deployer;
  address internal diamond;

  function setUp() public virtual {
    deployer = _randomAddress();

    vm.startPrank(deployer);
    diamond = address(new MockDiamond());
  }
}

abstract contract FacetHelper {
  /// @dev Deploy facet contract in constructor and return address for testing.
  function facet() public view virtual returns (address);

  function selectors() public view virtual returns (bytes4[] memory);

  function initializer() public view virtual returns (bytes4);

  function makeCut(
    IDiamond.FacetCutAction action
  ) public view returns (IDiamond.FacetCut memory) {
    return
      IDiamond.FacetCut({
        action: action,
        facetAddress: facet(),
        functionSelectors: selectors()
      });
  }

  function makeDeployCut(
    address facetAddress,
    IDiamond.FacetCutAction action
  ) public view returns (IDiamond.FacetCut memory) {
    return
      IDiamond.FacetCut({
        action: action,
        facetAddress: facetAddress,
        functionSelectors: selectors()
      });
  }

  function makeInitData(
    bytes memory
  ) public view virtual returns (address, bytes memory data) {
    return (facet(), abi.encodeWithSelector(initializer()));
  }
}
