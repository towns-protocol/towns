// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.23;

// interfaces

// libraries

// contracts
import {ERC20} from "contracts/src/diamond/facets/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
  constructor(string memory name, string memory symbol) {
    __ERC20_init_unchained(name, symbol, 18);
  }

  function mint(address account, uint256 amount) public {
    _mint(account, amount);
  }
}
