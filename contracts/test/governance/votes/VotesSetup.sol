// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC6372} from "@openzeppelin/contracts/interfaces/IERC6372.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

// libraries

// helpers
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

contract VotesHelper is FacetHelper {
  constructor() {
    bytes4[] memory selectors_ = new bytes4[](8);
    uint256 index;

    // Votes
    selectors_[index++] = IERC6372.clock.selector;
    selectors_[index++] = IERC6372.CLOCK_MODE.selector;
    selectors_[index++] = IVotes.getVotes.selector;
    selectors_[index++] = IVotes.getPastVotes.selector;
    selectors_[index++] = IVotes.getPastTotalSupply.selector;
    selectors_[index++] = IVotes.delegates.selector;
    selectors_[index++] = IVotes.delegate.selector;
    selectors_[index++] = IVotes.delegateBySig.selector;

    addSelectors(selectors_);
  }

  function selectors() public view override returns (bytes4[] memory) {
    return functionSelectors;
  }

  function initializer() public view virtual override returns (bytes4) {
    return "";
  }
}
