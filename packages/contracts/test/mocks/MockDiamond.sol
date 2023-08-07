// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts
import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {DiamondCutHelper} from "contracts/test/diamond/cut/DiamondCutSetup.sol";
import {DiamondLoupeHelper} from "contracts/test/diamond/loupe/DiamondLoupeSetup.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

/// @title MockDiamondHelper
/// @notice Used to create a diamond with all the facets we need for testing
contract MockDiamondHelper is TestUtils {
  function createDiamond(address owner) public returns (Diamond) {
    OwnableHelper ownableHelper = new OwnableHelper();
    DiamondCutHelper diamondCutHelper = new DiamondCutHelper();
    DiamondLoupeHelper diamondLoupeHelper = new DiamondLoupeHelper();
    MultiInit multiInit = new MultiInit();

    uint256 cutCount = 3;

    Diamond.FacetCut[] memory cuts = new Diamond.FacetCut[](cutCount);
    cuts[0] = ownableHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[1] = diamondCutHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[2] = diamondLoupeHelper.makeCut(IDiamond.FacetCutAction.Add);

    address[] memory addresses = new address[](cutCount);
    bytes[] memory payloads = new bytes[](cutCount);

    addresses[0] = ownableHelper.facet();
    addresses[1] = diamondCutHelper.facet();
    addresses[2] = diamondLoupeHelper.facet();

    payloads[0] = ownableHelper.makeInitData(abi.encode(owner));
    payloads[1] = diamondCutHelper.makeInitData("");
    payloads[2] = diamondLoupeHelper.makeInitData("");

    return
      new Diamond(
        Diamond.InitParams({
          baseFacets: cuts,
          init: address(multiInit),
          initData: abi.encodeWithSelector(
            multiInit.multiInit.selector,
            addresses,
            payloads
          )
        })
      );
  }
}
