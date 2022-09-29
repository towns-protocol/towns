// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.4;

import "openzeppelin-contracts/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract Zion is ERC20Votes {
  uint256 public vTotalSupply = 1_000_000_000e18;

  constructor() ERC20("Zion", "ZION") ERC20Permit("Zion") {
    _mint(msg.sender, vTotalSupply);
  }

  function _afterTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal override(ERC20Votes) {
    super._afterTokenTransfer(from, to, amount);
  }

  function _mint(address to, uint256 amount) internal override(ERC20Votes) {
    super._mint(to, amount);
  }

  function _burn(address account, uint256 amount)
    internal
    override(ERC20Votes)
  {
    super._burn(account, amount);
  }
}
