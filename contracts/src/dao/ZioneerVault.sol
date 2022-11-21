// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {IVotingVault} from "council/interfaces/IVotingVault.sol";
import {IERC721} from "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";

contract ZioneerVault is IVotingVault {
  IERC721 public immutable token;

  constructor(IERC721 _token) {
    token = _token;
  }

  function queryVotePower(
    address _user,
    uint256,
    bytes calldata
  ) public view override returns (uint256) {
    return token.balanceOf(_user);
  }
}
