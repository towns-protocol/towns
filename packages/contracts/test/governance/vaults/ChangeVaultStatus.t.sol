// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DaoBaseSetup} from "contracts/test/governance/DaoBaseSetup.sol";
import {DaoCoreVoting} from "contracts/src/governance/base/DaoCoreVoting.sol";
import {Dao} from "contracts/src/governance/Dao.sol";
import {NFTVault} from "contracts/src/governance/vaults/NFTVault.sol";
import {Mock721} from "contracts/test/mocks/MockToken.sol";

contract ChangeVaultStatusTest is DaoBaseSetup {
  // function ChangeVaultStatus() external {
  //   Mock721 nft = new Mock721();
  //   NFTVault newVault = new NFTVault(address(nft));
  //   // we check that the vault is not approved
  //   assertFalse(dao.approvedVaults(address(newVault)));
  //   address[] memory spaceOwners = _mockSpaceOwners();
  //   // GOAL:
  //   // We will create a proposal on dao to register a call on the timelock that tells the dao to approve our new vault to true
  //   // the dao owns the timelock and the timelock owns the dao, so we have to do this in a roundabout way
  //   // dao -> timelock -> dao
  //   // we want the timelock to call the dao contract and have it call changeVaultStatus
  //   address[] memory targets = new address[](1);
  //   targets[0] = address(dao);
  //   bytes[] memory calldatas = new bytes[](1);
  //   calldatas[0] = abi.encodeCall(
  //     dao.changeVaultStatus,
  //     (address(newVault), true)
  //   );
  //   // create the call hash
  //   bytes32 callHash = keccak256(abi.encode(targets, calldatas));
  //   // create proposal on dao for timelock to register call back to the dao
  //   address[] memory proposalTargets = new address[](1);
  //   proposalTargets[0] = address(timelock);
  //   // create calldata for the proposal, this is the callhash we created earlier
  //   bytes[] memory proposalCalldatas = new bytes[](1);
  //   proposalCalldatas[0] = abi.encodeCall(timelock.registerCall, callHash);
  //   // CHEAT CODE: set the quorum for this proposal to be 2, we would usually wait for the default quorum to be reached
  //   vm.prank(address(timelock));
  //   dao.setCustomQuorum(address(timelock), timelock.registerCall.selector, 2);
  //   // END CHEAT CODE
  //   // setup voting vaults we will use to vote on this proposal
  //   address[] memory votingVaults = new address[](1);
  //   votingVaults[0] = address(memberVault);
  //   // as an nft holder, I will create the proposal on the dao contract and vote yes
  //   vm.prank(spaceOwners[0]);
  //   dao.proposal(
  //     votingVaults, // voting vaults
  //     new bytes[](1), // extra data for voting vaults
  //     proposalTargets, // targets for the proposal
  //     proposalCalldatas, // calldatas for the proposal
  //     5 days, // voting period
  //     DaoCoreVoting.Ballot.YES // proposal creator voting choice
  //   );
  //   // get the proposal info
  //   Dao.ProposalInfo[] memory _proposals = dao.getProposals();
  //   // check that the proposal was created
  //   assertEq(_proposals.length, 1);
  //   assertEq(_proposals[0].proposal.quorum, 2);
  //   // vote on the proposal as space owner 2
  //   vm.prank(spaceOwners[1]);
  //   dao.vote(
  //     votingVaults,
  //     new bytes[](1),
  //     _proposals[0].proposalId,
  //     DaoCoreVoting.Ballot.YES
  //   );
  //   // unlock proposal execution time
  //   vm.roll(_proposals[0].proposal.unlock);
  //   // execute proposal to register a call on the timelock
  //   // use a random address to show anyone can execute this
  //   vm.prank(_randomAddress());
  //   dao.execute(_proposals[0].proposalId, proposalTargets, proposalCalldatas);
  //   // once proposal executes, we verify that the timelock has the callHash registered
  //   assertEq(timelock.callTimestamps(callHash), block.timestamp);
  //   // move forward in time so we can execute the call
  //   vm.warp(timelock.callTimestamps(callHash) + timelock.waitTime() + 1);
  //   // execute the proposal on the timelock
  //   vm.prank(_randomAddress()); // anyone can execute this
  //   timelock.execute(targets, calldatas); // pass in the targets and calldatas we created earlier that match the callHash
  //   // check if vault has been approved
  //   assertTrue(dao.approvedVaults(address(newVault)));
  // }
  // function _mockSpaceOwners() internal returns (address[] memory spaceOwners) {
  //   spaceOwners = _createAccounts(3);
  //   for (uint256 i = 0; i < spaceOwners.length; i++) {
  //     owner.mintTo(spaceOwners[i], "ipfs://test");
  //   }
  //   vm.roll(block.number + 1);
  // }
}
