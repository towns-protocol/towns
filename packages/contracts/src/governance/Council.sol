// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

// libraries

// contracts
import {CoreVoting} from "contracts/src/governance/base/CoreVoting.sol";
import {DaoCoreVoting} from "contracts/src/governance/base/DaoCoreVoting.sol";

contract Council is CoreVoting {
  struct ProposalInfo {
    address[] targets;
    address[] vaults;
    bytes[] vaultData;
    bytes[] payloads;
    uint256 lastCall;
    DaoCoreVoting.Ballot ballot;
  }

  address public targetContract;
  address[] public councilVaults;
  uint256 public councilLastCall;

  mapping(uint256 => ProposalInfo) public proposalInfo;

  constructor(
    address _timelock,
    uint256 _baseQuorum,
    uint256 _minVotingPower,
    address _gsc,
    address[] memory _votingVaults
  ) CoreVoting(_timelock, _baseQuorum, _minVotingPower, _gsc, _votingVaults) {
    councilVaults = _votingVaults;
    councilLastCall = 3 days;
  }

  function createProxyProposal(
    address[] memory proposalTargets,
    address[] memory proposalVaults,
    bytes[] memory proposalVaultData,
    bytes[] memory proposalPayloads,
    uint256 proposalLastCall,
    DaoCoreVoting.Ballot proposalBallot
  ) public {
    DaoCoreVoting target = DaoCoreVoting(targetContract);

    bytes[] memory councilPayload = new bytes[](1);
    councilPayload[0] = abi.encodeCall(
      target.proposal,
      (
        proposalVaults,
        proposalVaultData,
        proposalTargets,
        proposalPayloads,
        proposalLastCall,
        proposalBallot
      )
    );

    address[] memory councilTargets = new address[](1);
    councilTargets[0] = targetContract;

    proposalInfo[proposalCount] = ProposalInfo(
      proposalTargets,
      proposalVaults,
      proposalVaultData,
      proposalPayloads,
      proposalLastCall,
      proposalBallot
    );

    super.proposal(
      councilVaults,
      new bytes[](councilVaults.length),
      councilTargets,
      councilPayload,
      councilLastCall,
      CoreVoting.Ballot.YES
    );
  }

  function voteProxyProposal(
    uint256 proposalId,
    CoreVoting.Ballot ballot
  ) public {
    super.vote(
      councilVaults,
      new bytes[](councilVaults.length),
      proposalId,
      ballot
    );
  }

  function executeProxyProposal(uint256 proposalId) public {
    DaoCoreVoting target = DaoCoreVoting(targetContract);

    bytes[] memory calldatas = new bytes[](1);
    calldatas[0] = abi.encodeCall(
      target.proposal,
      (
        proposalInfo[proposalId].vaults,
        proposalInfo[proposalId].vaultData,
        proposalInfo[proposalId].targets,
        proposalInfo[proposalId].payloads,
        proposalInfo[proposalId].lastCall,
        proposalInfo[proposalId].ballot
      )
    );

    address[] memory targets = new address[](1);
    targets[0] = targetContract;

    super.execute(proposalId, targets, calldatas);
  }

  function setLasCall(uint256 _lastCall) public onlyOwner {
    councilLastCall = _lastCall;
  }

  function setTarget(address _targetContract) public onlyOwner {
    targetContract = _targetContract;
  }

  function changeVaultStatus(
    address vault,
    bool isValid
  ) public override onlyOwner {
    // make sure there's a lest one voting vault
    require(
      isValid || councilVaults.length > 1,
      "Council: there must be at least one voting vault"
    );

    super.changeVaultStatus(vault, isValid);

    // remove or add from voting vaults
    if (isValid) {
      councilVaults.push(vault);
    } else {
      for (uint256 i = 0; i < councilVaults.length; i++) {
        if (councilVaults[i] == vault) {
          councilVaults[i] = councilVaults[councilVaults.length - 1];
          councilVaults.pop();
          break;
        }
      }
    }
  }
}
