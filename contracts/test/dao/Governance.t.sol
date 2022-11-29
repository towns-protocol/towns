// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "forge-std/Test.sol";

import {Zioneer} from "contracts/src/dao/Zioneer.sol";
import {ZionDao} from "contracts/src/dao/ZionDao.sol";
import {CoreVoting} from "council/CoreVoting.sol";
import {Timelock} from "council/features/Timelock.sol";
import {ZioneerVault} from "contracts/src/dao/ZioneerVault.sol";
import {SimpleProxy} from "contracts/src/dao/utils/SimpleProxy.sol";

contract GovernanceTest is Test {
  Zioneer zioneer;
  ZioneerVault vaultBase;
  ZioneerVault vault;
  ZionDao coreVoting;
  Timelock timelock;
  SimpleProxy proxy;

  address deployer = address(this);
  address zero = address(0);
  address bob = address(0x1);
  address alice = address(0x2);

  function setUp() public {
    coreVoting = new ZionDao(
      deployer, // timelock
      10, // base quorum
      1, // mininum voting power to create proposal
      zero, // gsc
      new address[](0) // voting vaults
    );

    // setup timelock
    timelock = new Timelock(
      1000, // amount of time in seconds for the waiting period
      address(coreVoting), // governance
      zero // gsc
    );

    // setup zioneer nft
    zioneer = new Zioneer("Zioneer", "ZNR", "https://znr.com/");

    // deploy zioneer vault
    vaultBase = new ZioneerVault(zioneer);

    // deploy a simple proxy
    proxy = new SimpleProxy(address(timelock), address(vaultBase));

    // get wrapped vault
    vault = ZioneerVault(address(proxy));

    // whitelist zioneer vault
    coreVoting.changeVaultStatus(address(proxy), true);

    // overwrite settings to test in this contract
    coreVoting.setLockDuration(0);
    coreVoting.changeExtraVotingTime(0);

    // create a custom quorum for the mint function in the zioneer vault
    coreVoting.setCustomQuorum(
      address(zioneer),
      bytes4(zioneer.mintTo.selector), // bytes4(keccak256("mintTo(address)")),
      2
    );

    // set timelock on corevoting
    coreVoting.setOwner(address(timelock));
  }

  function testMint() public {
    zioneer.setAllowed(address(this), true);
    zioneer.mintTo(address(this));
    assertEq(zioneer.balanceOf(address(this)), 1);
  }

  function testVault() public {
    zioneer.setAllowed(address(this), true);
    zioneer.mintTo(address(this));
    assertEq(zioneer.balanceOf(address(this)), 1);
    assertEq(vault.queryVotePower(address(this), 0, ""), 1);
  }

  function testCreateProposal() public {
    zioneer.setAllowed(address(this), true);
    zioneer.setAllowed(address(coreVoting), true);

    // mint nft so I can create a proposal
    zioneer.mintTo(address(this));
    zioneer.mintTo(address(alice));
    assertEq(zioneer.balanceOf(address(this)), 1);

    // pass the voting vaults
    address[] memory votingVaults = new address[](1);
    votingVaults[0] = address(proxy);

    // pass any vault data needed
    bytes[] memory vaultData = new bytes[](1);

    // pass the target to call when proposal is passed
    address[] memory targets = new address[](1);
    targets[0] = address(zioneer);

    // pass function to execute on target when proposal is passed
    bytes[] memory calldatas = new bytes[](1);
    // calldatas[0] = abi.encodeWithSignature("mintTo(address)", address(bob));
    calldatas[0] = abi.encodeCall(zioneer.mintTo, address(bob));

    vm.roll(2);

    // create proposal
    coreVoting.proposal(
      votingVaults,
      vaultData,
      targets,
      calldatas,
      4,
      CoreVoting.Ballot.YES
    );

    // vote
    vm.prank(alice);
    coreVoting.vote(votingVaults, vaultData, 0, CoreVoting.Ballot.YES);

    // get voting power of proposal
    uint128[3] memory results = coreVoting.getProposalVotingPower(0);

    // get quorum
    (, , , uint quorum, , ) = coreVoting.proposals(0);

    bool passesQuorum = results[0] + results[1] + results[2] >= quorum;
    bool majorityInFavor = results[0] > results[1];

    // // get custom quorum
    // uint customQuorum = coreVoting.quorums(
    //   address(zioneer),
    //   bytes4(keccak256("mint(address)"))
    // );

    // execute if voting power is same as quorum
    if (passesQuorum && majorityInFavor) {
      coreVoting.execute(0, targets, calldatas);
    }

    assertEq(zioneer.balanceOf(address(bob)), 1);
  }
}
