// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries

// contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {ERC721Holder} from "openzeppelin-contracts/contracts/token/ERC721/utils/ERC721Holder.sol";

contract ERC721HolderHelper is FacetHelper {
  ERC721Holder internal holder;

  constructor() {
    holder = new ERC721Holder();
  }

  function facet() public view override returns (address) {
    return address(holder);
  }

  function selectors() public pure override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](1);
    selectors_[0] = ERC721Holder.onERC721Received.selector;
    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return "";
  }
}
