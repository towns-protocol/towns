// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

import {DaoCoreVoting} from "./base/DaoCoreVoting.sol";

contract Dao is DaoCoreVoting {
  struct ProposalInfo {
    uint256 proposalId;
    Proposal proposal;
  }

  address[] public votingVaults;

  constructor(
    address _timelock,
    uint256 _baseQuorum,
    address _gsc,
    address[] memory _votingVaults
  ) DaoCoreVoting(_timelock, _baseQuorum, _gsc, _votingVaults) {
    votingVaults = _votingVaults;
  }

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

  function changeVaultStatus(
    address vault,
    bool isValid
  ) public override onlyOwner {
    // make sure there is at least one voting vault
    require(
      isValid || votingVaults.length > 1,
      "Dao: cannot remove last voting vault"
    );

    super.changeVaultStatus(vault, isValid);

    if (isValid) {
      votingVaults.push(vault);
    } else {
      for (uint256 i = 0; i < votingVaults.length; i++) {
        if (votingVaults[i] == vault) {
          votingVaults[i] = votingVaults[votingVaults.length - 1];
          votingVaults.pop();
          break;
        }
      }
    }
  }
}
