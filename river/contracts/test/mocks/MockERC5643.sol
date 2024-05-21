// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {ERC5643} from "contracts/src/diamond/facets/token/ERC5643/ERC5643.sol";

contract ERC5643Mock is ERC5643 {
  // @notice Should the duration be a constant or a variable set by owner?
  uint64 public constant MAXIMUM_DURATION = 30 days;
  uint64 public constant MINIMUM_DURATION = 1 days;

  function mintTo(address to) external returns (uint256 tokenId) {
    tokenId = _nextTokenId();
    _mint(to, 1);
    _renewSubscription(tokenId, MAXIMUM_DURATION);
  }

  function _isRenewable(uint256 tokenId) internal pure override returns (bool) {
    if (tokenId == 1) return false;
    return true;
  }
}
