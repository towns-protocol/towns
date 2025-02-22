// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

import {Towns} from "contracts/src/tokens/towns/base/Towns.sol";

contract MockTowns is Towns {
  function localMint(address to, uint256 amount) external onlyOwner {
    _mint(to, amount);
  }

  function localBurn(address from, uint256 amount) external onlyOwner {
    _burn(from, amount);
  }
}
