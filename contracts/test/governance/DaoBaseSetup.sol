// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

// interfaces
import {IERC20} from "council/interfaces/IERC20.sol";
import {IERC721} from "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";

//libraries

//contracts
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

import {CoreVoting} from "council/CoreVoting.sol";
import {Timelock} from "council/features/Timelock.sol";
import {Spender} from "council/features/Spender.sol";
import {Treasury} from "council/features/Treasury.sol";

import {LockingVault} from "council/vaults/LockingVault.sol";
import {GSCVault} from "council/vaults/GSCVault.sol";

import {Dao} from "contracts/src/governance/Dao.sol";
import {SimpleProxy} from "contracts/src/governance/utils/SimpleProxy.sol";
import {NFTVault} from "contracts/src/governance/vaults/NFTVault.sol";

import {Fuel} from "contracts/src/governance/tokens/Fuel.sol";
import {SpaceOwner} from "contracts/src/spacesv2/SpaceOwner.sol";

contract DaoBaseSetup is TestUtils {
  Dao dao;
  CoreVoting gsc;
  Timelock timelock;
  Spender spender;
  Treasury treasury;

  // vaults
  LockingVault lockingVault;
  GSCVault gscVault;
  NFTVault spaceOwnerVault;

  // tokens
  SpaceOwner spaceOwnerNFT;
  Fuel token;

  function init() internal {
    address deployer = address(this);
    uint256 daoBaseQuorum = 10;
    uint256 daoMinVotingPower = 1;

    address zero = address(0);
    address[] memory zeroAddresses = new address[](0);

    uint256 oneEther = 1 ether;
    uint256 twoEther = 2 ether;
    uint256 threeEther = 3 ether;

    // deploy fuel token
    token = new Fuel("Fuel", "FUEL");

    // deploy core voting with no vaults, change these + the timelock later
    dao = new Dao(
      deployer, // timelock contract address
      daoBaseQuorum, // default quorum for all functions with no set quorum
      daoMinVotingPower, // min voting power needed to submit proposal
      zero, // governance steering committee contract
      zeroAddresses // initial voting vaults to approve
    );

    uint256 councilBaseQuorum = 2500; // number of council members, this can be the council nft holders
    uint256 councilMinVotingPower = 1; // voting power of each council member

    // deploy a new copy of core voting for the gsc to use.
    // set quorum to be all available council nfts, and the minium voting power to be 1
    // this is so that the gsc can always create proposals
    gsc = new CoreVoting(
      deployer,
      councilBaseQuorum,
      councilMinVotingPower,
      zero,
      zeroAddresses
    );

    // deploy spender contract
    spender = new Spender(
      address(timelock), // owner of the spender contract
      address(gsc), // first allowed spender
      IERC20(address(token)), // token token address
      oneEther, // small spend limit
      twoEther, // medium spend limit
      threeEther // large spend limit
    );

    // deploy treasury contract
    treasury = new Treasury(
      address(timelock) // owner of the treasury contract
    );

    // deploy timelock, assign deployer for governance and gsc vault. Will be updated later
    timelock = new Timelock(
      1000, // amount of time in seconds for the waiting period
      deployer, // governance contract address
      deployer // governance steering committee contract address
    );

    /* ********** SETUP VAULTS ********** */

    uint256 councilVaultVotingPowerBound = 1;

    // setup gsc vault, no proxy needed
    gscVault = new GSCVault(
      dao, // dao contract address
      councilVaultVotingPowerBound, // max voting power bound for the gsc vault
      address(timelock) // owner of the gsc vault
    );

    // add approved vaults
    gsc.changeVaultStatus(address(gscVault), true);

    // add the space owner vault
    spaceOwnerVault = _deploySpaceOwnerVault();
    dao.changeVaultStatus(address(spaceOwnerVault), true);

    // add the node operator vault
    // add the council staking vault

    // fund the spender contract

    // fund the treasury contract ETH + ERC20

    // authorize gsc vault and change owner to be dao contract
    dao.authorize(address(gsc));
    dao.setOwner(address(timelock));

    // set timelock owner to be dao contract and authorize gsc
    timelock.deauthorize(deployer);
    timelock.authorize(address(gsc));
    timelock.setOwner(address(dao));

    // set gsc owner to be timelock contract
    gsc.setOwner(address(timelock));
  }

  function _deploySpaceOwnerVault() internal returns (NFTVault) {
    // deploy space owner nft
    spaceOwnerNFT = new SpaceOwner("Space Owner", "OWNER");

    // this would be the space factory contract
    spaceOwnerNFT.setFactory(address(this));

    // deploy nft vault
    NFTVault nftVaultBase = new NFTVault(IERC721(address(spaceOwnerNFT)));

    // deploy proxy for nft vault
    SimpleProxy nftVaultProxy = new SimpleProxy(
      address(timelock),
      address(nftVaultBase)
    );

    return NFTVault(address(nftVaultProxy));
  }

  function _deployLockingVault(
    address _token,
    address _timelock
  ) internal returns (LockingVault) {
    // deploy locking vault
    LockingVault vaultBase = new LockingVault(IERC20(_token), 199350);

    // deploy proxy for locking vault
    SimpleProxy lockingVaultProxy = new SimpleProxy(
      _timelock,
      address(vaultBase)
    );

    return LockingVault(address(lockingVaultProxy));
  }
}
