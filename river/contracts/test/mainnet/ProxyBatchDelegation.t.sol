// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IMainnetDelegationBase, IMainnetDelegation} from "contracts/src/base/registry/facets/mainnet/IMainnetDelegation.sol";
import {IAuthorizedClaimers} from "contracts/src/tokens/mainnet/claimer/IAuthorizedClaimers.sol";

// libraries
import {NodeOperatorStatus} from "contracts/src/base/registry/facets/operator/NodeOperatorStorage.sol";

// contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";
import {NodeOperatorFacet} from "contracts/src/base/registry/facets/operator/NodeOperatorFacet.sol";
import {Towns} from "contracts/src/tokens/towns/mainnet/Towns.sol";
import {ProxyBatchDelegation} from "contracts/src/tokens/mainnet/delegation/ProxyBatchDelegation.sol";

contract ProxyBatchDelegationTest is BaseSetup, IMainnetDelegationBase {
  IMainnetDelegation internal mainnetDelegation;
  ProxyBatchDelegation internal proxyDelegation;
  IAuthorizedClaimers internal authorizedClaimers;
  Towns internal towns;
  NodeOperatorFacet internal operatorFacet;

  address[] internal _users;
  address[] internal _operators;
  address[] internal _claimers;
  uint256 internal tokens;

  function setUp() public override {
    super.setUp();
    operatorFacet = NodeOperatorFacet(baseRegistry);

    _users = _createAccounts(10);
    _claimers = _createAccounts(5);
    _operators = _createAccounts(5);
    for (uint256 i; i < _operators.length; ++i) {
      setOperator(_operators[i]);
    }

    tokens = 10 ether;

    towns = Towns(mainnetRiverToken);
    proxyDelegation = ProxyBatchDelegation(mainnetProxyDelegation);
    mainnetDelegation = IMainnetDelegation(baseRegistry);
    authorizedClaimers = IAuthorizedClaimers(claimers);
  }

  function test_relayDelegationDigest()
    external
    givenUsersHaveTokens
    givenUsersHaveAuthorizedClaimers
    givenUsersHaveDelegatedTokens
  {
    vm.prank(_randomAddress());
    proxyDelegation.relayDelegationDigest(50_000);

    bytes memory encodedMsgs = proxyDelegation.getEncodedMsgs();

    vm.prank(deployer);
    mainnetDelegation.relayDelegations(encodedMsgs);

    for (uint256 i; i < _users.length; ++i) {
      address user = _users[i];
      Delegation memory delegation = mainnetDelegation.getDelegationByDelegator(
        user
      );
      assertEq(towns.delegates(user), delegation.operator);
      assertEq(
        authorizedClaimers.getAuthorizedClaimer(user),
        mainnetDelegation.getAuthorizedClaimer(user)
      );
    }
  }

  function _getRandomElement(
    address[] memory addresses
  ) internal pure returns (address) {
    require(addresses.length > 0, "No addresses available");
    return addresses[_randomUint256() % addresses.length];
  }

  function setOperator(address operator) internal {
    vm.assume(operator != address(0));
    if (!operatorFacet.isOperator(operator)) {
      vm.prank(operator);
      operatorFacet.registerOperator(operator);
      vm.startPrank(deployer);
      operatorFacet.setOperatorStatus(operator, NodeOperatorStatus.Approved);
      operatorFacet.setOperatorStatus(operator, NodeOperatorStatus.Active);
      vm.stopPrank();
    }
  }

  modifier givenUsersHaveTokens() {
    vm.startPrank(vault);
    for (uint256 i; i < _users.length; ++i) {
      towns.transfer(_users[i], tokens);
    }
    vm.stopPrank();
    _;
  }

  modifier givenUsersHaveAuthorizedClaimers() {
    for (uint256 i; i < _users.length; ++i) {
      vm.prank(_users[i]);
      authorizedClaimers.authorizeClaimer(_getRandomElement(_claimers));
    }
    _;
  }

  modifier givenUsersHaveDelegatedTokens() {
    for (uint256 i; i < _users.length; ++i) {
      vm.prank(_users[i]);
      towns.delegate(_getRandomElement(_operators));
    }
    _;
  }
}
