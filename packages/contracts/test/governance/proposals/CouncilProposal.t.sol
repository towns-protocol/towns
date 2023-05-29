// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

// interfaces
// libraries
import {console} from "forge-std/console.sol";

// contracts
import {DaoBaseSetup} from "contracts/test/governance/DaoBaseSetup.sol";
import {DaoCoreVoting} from "contracts/src/governance/base/DaoCoreVoting.sol";
import {SimpleCounter} from "contracts/test/mocks/SimpleCounter.sol";
import {Member} from "contracts/src/tokens/Member.sol";
import {CouncilVault} from "contracts/src/governance/vaults/CouncilVault.sol";
import {Council} from "contracts/src/governance/Council.sol";
import {CoreVoting} from "contracts/src/governance/base/CoreVoting.sol";

contract CouncilProposalTest is DaoBaseSetup {
  // target contract
  SimpleCounter internal _counter;
  Member internal _member;
  CouncilVault internal _councilVault;
  Council internal _council;
  DaoCoreVoting internal _dao;

  // actors
  address internal _spaceOwner;

  function setUp() public {
    _counter = new SimpleCounter();
    _member = Member(member);
    _council = Council(council);
    _dao = DaoCoreVoting(dao);
    _councilVault = CouncilVault(councilVault);
    _spaceOwner = _randomAddress();
  }

  function setUpProveMembership() public {
    // mint council nft to a member
    _member.startWaitlistMint();
    _member.startPublicMint();
    _member.publicMint{value: 0.08 ether}(_spaceOwner);

    // prove membership on membership vaults through council vault
    vm.prank(_spaceOwner);
    _councilVault.proveMembership(new bytes[](membershipVaults.length));

    // wait for the idle duration to pass so that the council vault can return a valid query vote power for the member
    vm.warp(block.timestamp + _councilVault.idleDuration());
  }

  function test_proveMembership() public {
    setUpProveMembership();

    // check membership
    assertEq(_councilVault.queryVotePower(_spaceOwner, 0, ""), 1);
  }

  function setUpCreateProposal() public {
    setUpProveMembership();

    // need to wait for the next block to be mined to be able to call the council contract to prevent flash loans
    vm.roll(block.number + 1);

    // the dao will call the counter contract
    address[] memory proposalTargets = new address[](1);
    proposalTargets[0] = address(_counter);

    // the dao will depend on the member vault to vote
    address[] memory proposalVaults = new address[](1);
    bytes[] memory proposalVaultData = new bytes[](1);
    proposalVaults[0] = address(memberVault);

    // the dao will use the following payload to call the counter contract
    bytes[] memory proposalPayloads = new bytes[](1);
    proposalPayloads[0] = abi.encodeCall(_counter.increment, ());

    vm.prank(_spaceOwner);
    _council.createProxyProposal(
      proposalTargets,
      proposalVaults,
      proposalVaultData,
      proposalPayloads,
      3 days,
      DaoCoreVoting.Ballot.YES
    );
  }

  function test_createProposal() public {
    // get proposal id
    uint256 proposalId = _council.proposalCount();

    setUpCreateProposal();

    // check that the proposal was created
    assertEq(_council.proposalCount(), proposalId + 1);
  }

  function test_voteOnProposal() public {
    uint256 proposalId = _council.proposalCount();

    setUpCreateProposal();

    address[] memory voters = _createAccounts(5);

    for (uint256 i = 0; i < voters.length; i++) {
      vm.deal(voters[i], 0.08 ether);
      vm.startPrank(voters[i]);
      _member.publicMint{value: 0.08 ether}(voters[i]);
      _councilVault.proveMembership(new bytes[](membershipVaults.length));
      vm.stopPrank();
    }

    // wait for the idle duration to pass so that the council vault can return a valid query vote power for the member
    vm.warp(block.timestamp + _councilVault.idleDuration());

    // setup voting parameters
    address[] memory councilVotingVaults = new address[](1);
    councilVotingVaults[0] = councilVault;

    bytes[] memory extraVaultData = new bytes[](1);

    // vote on the proposal
    for (uint256 i = 0; i < voters.length; i++) {
      vm.prank(voters[i]);
      _council.vote(
        councilVotingVaults,
        extraVaultData,
        proposalId,
        CoreVoting.Ballot.YES
      );
    }

    // check that the proposal was voted on
    uint128[3] memory results = _council.getProposalVotingPower(proposalId);

    assertEq(results[0], voters.length + 1);
  }

  function test_executeProposal() public {
    uint256 proposalId = _council.proposalCount();

    setUpCreateProposal();

    address[] memory voters = _createAccounts(5);

    for (uint256 i = 0; i < voters.length; i++) {
      vm.deal(voters[i], 0.08 ether);
      vm.startPrank(voters[i]);
      _member.publicMint{value: 0.08 ether}(voters[i]);
      _councilVault.proveMembership(new bytes[](membershipVaults.length));
      vm.stopPrank();
    }

    // wait for the idle duration to pass so that the council vault can return a valid query vote power for the member
    vm.warp(block.timestamp + _councilVault.idleDuration());

    // vote on the proposal
    for (uint256 i = 0; i < voters.length; i++) {
      vm.prank(voters[i]);
      _council.voteProxyProposal(proposalId, CoreVoting.Ballot.YES);
    }

    // wait for the proposal to be unlocked
    (, , uint128 _unlock, , , ) = _council.proposals(proposalId);
    vm.roll(_unlock);

    assertEq(_dao.proposalCount(), 0);

    // execute the proposal
    vm.prank(_randomAddress());
    _council.executeProxyProposal(proposalId);

    // check that the proposal was executed
    assertEq(_dao.proposalCount(), 1);
  }
}
