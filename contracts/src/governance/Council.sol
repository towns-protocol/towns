// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {CoreVoting} from "council/CoreVoting.sol";

contract Council is CoreVoting {
  constructor(
    address _timelock,
    uint256 _baseQuorum,
    uint256 _minVotingPower,
    address _gsc,
    address[] memory _votingVaults
  ) CoreVoting(_timelock, _baseQuorum, _minVotingPower, _gsc, _votingVaults) {}
}
