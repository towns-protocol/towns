// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

//interfaces

//libraries

//contracts
import {ProxyBatchDelegation} from "contracts/src/tokens/river/mainnet/delegation/ProxyBatchDelegation.sol";

// Mainnet
contract ForkProxyBatchDelegationTest is TestUtils {
  address river = 0x53319181e003E7f86fB79f794649a2aB680Db244;
  address claimers = 0x0bEe55b52d01C4D5d4D0cfcE1d6e0baE6722db05;
  address messenger = 0x866E82a600A1414e583f7F13623F1aC5d58b0Afa;
  address baseRegistry = 0x7c0422b31401C936172C897802CF0373B35B7698;

  ProxyBatchDelegation internal proxyBatchDelegation;

  function setUp() external onlyForked {
    proxyBatchDelegation = new ProxyBatchDelegation(
      river,
      claimers,
      messenger,
      baseRegistry
    );
  }

  function test_sendAuthorizedClaimers() external onlyForked {
    vm.prank(_randomAddress());
    proxyBatchDelegation.sendAuthorizedClaimers();
  }
}
