// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;

// interfaces
import {IERC721} from "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";

// third-party
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {CoreVoting} from "contracts/src/core/governance/base/CoreVoting.sol";
import {DaoCoreVoting} from "contracts/src/core/governance/base/DaoCoreVoting.sol";

// contracts
import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {Timelock} from "council/features/Timelock.sol";
import {Treasury} from "council/features/Treasury.sol";

import {Dao} from "contracts/src/core/governance/Dao.sol";
import {Council} from "contracts/src/core/governance/Council.sol";

// tokens
import {Towns} from "contracts/src/core/tokens/Towns.sol";
import {Member} from "contracts/src/core/tokens/Member.sol";
import {SpaceOwner} from "contracts/src/core/tokens/SpaceOwner.sol";
import {Operator} from "contracts/src/core/tokens/Operator.sol";

// vaults
import {SimpleProxy} from "contracts/src/misc/SimpleProxy.sol";
import {CouncilVault} from "contracts/src/core/governance/vaults/CouncilVault.sol";
import {NFTVault} from "contracts/src/core/governance/vaults/NFTVault.sol";

contract DaoBaseSetup is TestUtils {
  address public dao;
  address public council;
  address public timelock;
  address public treasury;

  // tokens
  address towns;
  address member;
  address operator;

  // vaults
  address councilVault;
  address memberVault;
  address operatorVault;

  // operators
  address[] councilVaults;
  address[] councilTargets;
  address[] membershipVaults;

  constructor() {
    address deployer = address(this);
    address zero = address(0);
    address[] memory zeroArray = new address[](0);

    towns = address(new Towns("Towns", "TOWNS"));
    member = address(new Member("Member", "MEMBER", "", ""));
    operator = address(new Operator());

    // deploy timelock
    timelock = address(new Timelock(1000, deployer, deployer));

    // deploy treasury contract
    treasury = address(
      new Treasury(
        address(timelock) // owner of the treasury contract
      )
    );

    // vaults
    operatorVault = address(
      NFTVault(
        address(
          new SimpleProxy(
            address(timelock),
            address(new NFTVault(address(operator)))
          )
        )
      )
    );

    memberVault = address(
      NFTVault(
        address(
          new SimpleProxy(
            address(timelock),
            address(new NFTVault(address(member)))
          )
        )
      )
    );

    // deploy council
    council = address(
      new Council(
        deployer, // owner
        5, // base quorum for proposal votes
        1, // min voting power to submit a proposal
        zero, // gsc
        zeroArray // initial voting vaults
      )
    );

    // deploy dao
    dao = address(
      new Dao(
        deployer, // owner
        10, // base quorum for proposal votes
        address(council), // gsc
        zeroArray // initial voting vaults
      )
    );

    membershipVaults = new address[](2);
    membershipVaults[0] = address(operatorVault);
    membershipVaults[1] = address(memberVault);

    councilVault = address(
      new CouncilVault(
        membershipVaults, // approved vaults to prove membership
        1, // min voting power to be a council member
        address(timelock) // owner of the vault
      )
    );

    // set the council target to the dao
    Council(council).setTarget(address(dao));

    // add the gsc vault to the council to prove membership
    Council(council).changeVaultStatus(address(councilVault), true);

    // add members and operators vault to dao
    Dao(dao).changeVaultStatus(address(memberVault), true);

    // fund treasury with towns and ETH
    Towns(towns).mintTo(address(treasury), 1000000 ether);

    // dao ownership
    Dao(dao).authorize(address(council));
    Dao(dao).setOwner(address(timelock));

    // timelock ownership
    Timelock(timelock).deauthorize(deployer);
    Timelock(timelock).authorize(address(council));
    Timelock(timelock).setOwner(address(dao));

    // council ownership
    Council(council).setOwner(address(timelock));

    // targets and vaults
    councilTargets = new address[](1);
    councilTargets[0] = address(dao);

    councilVaults = new address[](1);
    councilVaults[0] = address(councilVault);
  }
}
