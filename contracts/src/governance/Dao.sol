// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {CoreVoting} from "council/CoreVoting.sol";

contract Dao is CoreVoting {
  struct ProposalInfo {
    uint256 proposalId;
    Proposal proposal;
  }

  constructor(
    address _timelock,
    uint256 _baseQuorum,
    uint256 _minVotingPower,
    address _gsc,
    address[] memory _votingVaults
  ) CoreVoting(_timelock, _baseQuorum, _minVotingPower, _gsc, _votingVaults) {}

  function getProposalById(
    uint256 _proposalId
  ) public view returns (Proposal memory) {
    return proposals[_proposalId];
  }

  function getProposals() public view returns (ProposalInfo[] memory) {
    ProposalInfo[] memory _proposals = new ProposalInfo[](proposalCount);

    for (uint256 i = 0; i < proposalCount; i++) {
      _proposals[i].proposalId = i;
      _proposals[i].proposal = proposals[i];
    }

    return _proposals;
  }
}
