// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

import {IVotingVault} from "council/interfaces/IVotingVault.sol";
import {IERC721} from "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";

contract NFTVault is IVotingVault {
  address public immutable token;

  constructor(address _token) {
    token = _token;
  }

  function queryVotePower(
    address _user,
    uint256,
    bytes calldata
  ) public view override returns (uint256) {
    return IERC721(token).balanceOf(_user);
  }
}
