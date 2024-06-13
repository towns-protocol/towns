// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IMainnetDelegationBase} from "contracts/src/tokens/river/base/delegation/IMainnetDelegation.sol";

// libraries

// contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";

// deps
import {River} from "contracts/src/tokens/river/mainnet/River.sol";
import {MainnetDelegation} from "contracts/src/tokens/river/base/delegation/MainnetDelegation.sol";
import {ProxyBatchDelegation} from "contracts/src/tokens/river/mainnet/delegation/ProxyBatchDelegation.sol";
import {ICrossDomainMessenger} from "contracts/src/tokens/river/mainnet/delegation/ICrossDomainMessenger.sol";
import {AuthorizedClaimers} from "contracts/src/tokens/river/mainnet/claimer/AuthorizedClaimers.sol";

contract ProxyBatchDelegationTest is BaseSetup, IMainnetDelegationBase {
  MainnetDelegation internal delegation;
  ProxyBatchDelegation internal proxyDelegation;
  AuthorizedClaimers internal authorizedClaimers;
  River internal rvr;
  ICrossDomainMessenger internal crossDomainMessenger;

  address[] internal _users;
  address[] internal _operators;
  address[] internal _claimers;
  uint256 internal tokens;

  function setUp() public override {
    super.setUp();

    _users = _createAccounts(10);
    _operators = _createAccounts(5);
    _claimers = _createAccounts(5);
    tokens = 10 ether;

    rvr = River(mainnetRiverToken);
    proxyDelegation = ProxyBatchDelegation(mainnetProxyDelegation);
    crossDomainMessenger = ICrossDomainMessenger(address(messenger));

    delegation = MainnetDelegation(baseRegistry);
    authorizedClaimers = AuthorizedClaimers(claimers);
  }

  modifier givenUsersHaveTokens() {
    for (uint256 i = 0; i < _users.length; i++) {
      vm.prank(vault);
      rvr.transfer(_users[i], tokens);
    }
    _;
  }

  modifier givenUsersHaveAuthorizedClaimers() {
    for (uint256 i = 0; i < _users.length; i++) {
      vm.prank(_users[i]);
      authorizedClaimers.authorizeClaimer(_getRandomValue(_claimers));
    }
    _;
  }

  modifier givenUsersHaveDelegatedTokens() {
    for (uint256 i = 0; i < _users.length; i++) {
      vm.prank(_users[i]);
      rvr.delegate(_getRandomValue(_operators));
    }
    _;
  }

  function test_sendAuthorizedClaimers()
    external
    givenUsersHaveTokens
    givenUsersHaveDelegatedTokens
  {
    address randomUser = _getRandomValue(_users);
    address randomClaimer = _getRandomValue(_claimers);

    // Have random user authorize a claimer on mainnet
    vm.prank(randomUser);
    authorizedClaimers.authorizeClaimer(randomClaimer);

    // Send values across the bridge to base
    vm.prank(_randomAddress());
    proxyDelegation.sendAuthorizedClaimers();

    // Check if the claimer is the same on both sides
    assertEq(
      authorizedClaimers.getAuthorizedClaimer(randomUser),
      delegation.getAuthorizedClaimer(randomUser)
    );
  }

  function test_sendDelegations()
    external
    givenUsersHaveTokens
    givenUsersHaveAuthorizedClaimers
    givenUsersHaveDelegatedTokens
  {
    vm.prank(_randomAddress());
    proxyDelegation.sendDelegators();

    address randomUser = _getRandomValue(_users);

    Delegation memory delegator = delegation.getDelegationByDelegator(
      randomUser
    );

    assertEq(rvr.delegates(randomUser), delegator.operator);
    assertEq(
      authorizedClaimers.getAuthorizedClaimer(randomUser),
      delegation.getAuthorizedClaimer(randomUser)
    );
  }

  function _getRandomValue(
    address[] memory addresses
  ) internal view returns (address) {
    require(addresses.length > 0, "No addresses available");

    // Generate a pseudo-random index based on block properties
    uint256 randomIndex = uint256(
      keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender))
    ) % addresses.length;

    return addresses[randomIndex];
  }
}
