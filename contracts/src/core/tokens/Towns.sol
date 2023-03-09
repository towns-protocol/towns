// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

//interfaces

//libraries

//contracts
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract Towns is ERC20, Ownable, ERC20Permit {
  //types (variables, structs, enums)

  //state (mappings, arrays)

  //modifier

  //fallback

  //functions
  constructor(
    string memory name,
    string memory symbol
  ) ERC20(name, symbol) ERC20Permit(name) {}

  function mint(address to, uint256 amount) external onlyOwner {
    _mint(to, amount);
  }
}
