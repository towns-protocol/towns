// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

//interfaces

//libraries

//contracts
import {DeployProxyBatchDelegation} from "contracts/scripts/deployments/DeployProxyBatchDelegation.s.sol";
import {ProxyBatchDelegation} from "contracts/src/tokens/river/mainnet/delegation/ProxyBatchDelegation.sol";

import {MockMessenger} from "contracts/test/mocks/MockMessenger.sol";
import {MainnetDelegation} from "contracts/src/tokens/river/base/delegation/MainnetDelegation.sol";

contract ForkPlaygroundTest is TestUtils {
  // Base Registry on Base
  address baseRegistryAddress = 0x7c0422b31401C936172C897802CF0373B35B7698;

  DeployProxyBatchDelegation deployer = new DeployProxyBatchDelegation();

  ProxyBatchDelegation internal proxyBatchDelegation;
  MainnetDelegation internal mainnetDelegation;

  function setUp() external onlyForked {
    mainnetDelegation = MainnetDelegation(baseRegistryAddress);
  }

  function test_setBatchDelegationCross() external onlyForked {
    address getMessenger = mainnetDelegation.getMessenger();
    address getProxyDelegation = mainnetDelegation.getProxyDelegation();

    MockMessenger mockMessenger = new MockMessenger();
    vm.etch(getMessenger, address(mockMessenger).code);
    MockMessenger(getMessenger).setXDomainMessageSender(getProxyDelegation);

    vm.prank(address(getMessenger));

    (bool success, ) = baseRegistryAddress.call{gas: 400_000}(
      // solhint-disable-next-line max-line-length
      hex"f59832ed000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000002000000000000000000000000406d4b68d5b0797c5d26437938958f2bb2e9c84e000000000000000000000000a28c8d49957f757dc9eb3df461f0c416f97a2b000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000406d4b68d5b0797c5d26437938958f2bb2e9c84e00000000000000000000000053319181e003e7f86fb79f794649a2ab680db244000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008ac7230489e80000"
    );

    // Check the result
    require(success, "Call failed");
  }
}
