// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {Vm} from "forge-std/Vm.sol";
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

//interfaces
import {IERC173} from "@river-build/diamond/src/facets/ownable/IERC173.sol";
import {IMainnetDelegation} from "contracts/src/base/registry/facets/mainnet/IMainnetDelegation.sol";
import {IRewardsDistribution} from "contracts/src/base/registry/facets/distribution/v2/IRewardsDistribution.sol";

//libraries

//contracts
import {ProxyBatchDelegation} from "contracts/src/tokens/mainnet/delegation/ProxyBatchDelegation.sol";
import {MockMessenger} from "contracts/test/mocks/MockMessenger.sol";

// Mainnet
contract ForkProxyBatchDelegationTest is TestUtils {
  // event SentMessage(address indexed target, address sender, bytes message, uint256 messageNonce, uint256 gasLimit);
  bytes32 internal constant SENT_MESSAGE_TOPIC =
    keccak256("SentMessage(address,address,bytes,uint256,uint256)");

  address internal constant RIVER = 0x53319181e003E7f86fB79f794649a2aB680Db244;
  address internal constant CLAIMERS =
    0x0bEe55b52d01C4D5d4D0cfcE1d6e0baE6722db05;
  address internal constant MESSENGER =
    0x866E82a600A1414e583f7F13623F1aC5d58b0Afa;
  address internal constant BASE_REGISTRY =
    0x7c0422b31401C936172C897802CF0373B35B7698;

  ProxyBatchDelegation internal proxyBatchDelegation;

  function setUp() external onlyForked {
    vm.createSelectFork("mainnet", 21596238);

    proxyBatchDelegation = new ProxyBatchDelegation(
      RIVER,
      CLAIMERS,
      MESSENGER,
      BASE_REGISTRY
    );
  }

  function test_relayDelegationDigest() external onlyForked {
    uint32 minGasLimit = 50_000;
    vm.recordLogs();
    vm.prank(_randomAddress());
    proxyBatchDelegation.relayDelegationDigest(minGasLimit);

    bytes memory encodedMsgs = proxyBatchDelegation.getEncodedMsgs();

    Vm.Log[] memory logs = vm.getRecordedLogs();
    bytes memory message;
    for (uint256 i; i < logs.length; ++i) {
      if (
        logs[i].topics.length > 0 && logs[i].topics[0] == SENT_MESSAGE_TOPIC
      ) {
        (, message, , ) = abi.decode(
          logs[i].data,
          (address, bytes, uint256, uint256)
        );
        break;
      }
    }
    assertGt(message.length, 0, "message not found");

    // switch to the base fork
    vm.createSelectFork("base", 24877033);

    address getMessenger = IMainnetDelegation(BASE_REGISTRY).getMessenger();
    vm.etch(getMessenger, type(MockMessenger).runtimeCode);
    MockMessenger(getMessenger).setXDomainMessageSender(
      IMainnetDelegation(BASE_REGISTRY).getProxyDelegation()
    );

    vm.prank(address(getMessenger));
    (bool success, ) = BASE_REGISTRY.call{gas: minGasLimit}(message);
    assertTrue(success, "setDelegationDigest failed");

    vm.prank(IERC173(BASE_REGISTRY).owner());
    IMainnetDelegation(BASE_REGISTRY).relayDelegations(encodedMsgs);

    assertGt(
      IRewardsDistribution(BASE_REGISTRY)
        .getDepositsByDepositor(BASE_REGISTRY)
        .length,
      0,
      "mainnet delegation failed"
    );
  }
}
