// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {LogUtils} from "test/utils/LogUtils.sol";
import {TestUtils} from "@towns-protocol/diamond/test/TestUtils.sol";

// interfaces
import {IERC173} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IRewardsDistribution} from "src/base/registry/facets/distribution/v2/IRewardsDistribution.sol";
import {IMainnetDelegation} from "src/base/registry/facets/mainnet/IMainnetDelegation.sol";

// libraries
import {console} from "forge-std/console.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {LibString} from "solady/utils/LibString.sol";

// contracts
import {MainnetDelegation} from "src/base/registry/facets/mainnet/MainnetDelegation.sol";
import {ProxyBatchDelegation} from "src/tokens/mainnet/delegation/ProxyBatchDelegation.sol";
import {MockMessenger} from "test/mocks/MockMessenger.sol";

contract ForkProxyBatchDelegationTest is LogUtils, TestUtils {
    using EnumerableSetLib for EnumerableSetLib.AddressSet;
    using LibString for *;

    // event SentMessage(address indexed target, address sender, bytes message, uint256 messageNonce, uint256 gasLimit);
    bytes32 internal constant SENT_MESSAGE_TOPIC =
        keccak256("SentMessage(address,address,bytes,uint256,uint256)");

    address internal constant TOWNS = 0x000000Fa00b200406de700041CFc6b19BbFB4d13;
    address internal constant CLAIMERS = 0x0bEe55b52d01C4D5d4D0cfcE1d6e0baE6722db05;
    address internal constant MESSENGER = 0x866E82a600A1414e583f7F13623F1aC5d58b0Afa;
    address internal constant BASE_REGISTRY = 0x7c0422b31401C936172C897802CF0373B35B7698;
    IMainnetDelegation internal constant MAINNET_DELEGATION = IMainnetDelegation(BASE_REGISTRY);
    string internal constant outDir = "resources/";

    uint256 internal constant MAINNET_BLOCK_NUMBER = 22591100;
    uint256 internal constant BASE_BLOCK_NUMBER = 30882700;

    ProxyBatchDelegation internal proxyBatchDelegation;

    // Storage sets for analytics helper functions
    EnumerableSetLib.AddressSet internal operators;
    EnumerableSetLib.AddressSet internal beforeDelegators;
    EnumerableSetLib.AddressSet internal afterDelegators;

    // Analytics data structure
    struct DelegationAnalytics {
        address delegator;
        address operator;
        uint256 quantity;
        uint256 delegationTime;
        address claimer;
        uint256 depositId;
    }

    function setUp() external onlyForked {
        vm.createSelectFork("mainnet", MAINNET_BLOCK_NUMBER);

        proxyBatchDelegation = new ProxyBatchDelegation(TOWNS, CLAIMERS, MESSENGER, BASE_REGISTRY);

        vm.label(TOWNS, "Towns");
        vm.label(CLAIMERS, "Claimers");
        vm.label(MESSENGER, "Messenger");
        vm.label(BASE_REGISTRY, "BaseRegistry");
    }

    function test_relayDelegationDigest() external onlyForked {
        uint32 minGasLimit = 50_000;

        // Step 1: Capture delegations on mainnet before relaying
        vm.recordLogs();
        vm.prank(_randomAddress());
        proxyBatchDelegation.relayDelegationDigest(minGasLimit);

        bytes memory encodedMsgs = proxyBatchDelegation.getEncodedMsgs();

        (, bytes memory message, , ) = abi.decode(
            _getFirstMatchingLog(vm.getRecordedLogs(), SENT_MESSAGE_TOPIC).data,
            (address, bytes, uint256, uint256)
        );
        assertGt(message.length, 0, "message not found");

        // Switch to base fork
        vm.createSelectFork("base", BASE_BLOCK_NUMBER);

        MainnetDelegation mockMainnetDelegation = new MainnetDelegation();

        vm.mockFunction(
            BASE_REGISTRY,
            address(mockMainnetDelegation),
            abi.encodeCall(IMainnetDelegation.getMainnetDelegators, ())
        );

        // Ensure output directory exists before writing files
        _ensureOutputDirExists();

        // Step 2: Capture delegations BEFORE cross-chain relaying
        DelegationAnalytics[] memory delegationsBefore = _captureDelegationAnalytics("BEFORE");
        _exportDelegationsToCSV(delegationsBefore, "delegations_before_relay.csv");

        // Perform cross-chain relaying
        address getMessenger = MAINNET_DELEGATION.getMessenger();
        vm.etch(getMessenger, type(MockMessenger).runtimeCode);
        MockMessenger(getMessenger).setXDomainMessageSender(
            MAINNET_DELEGATION.getProxyDelegation()
        );

        vm.prank(address(getMessenger));
        (bool success, ) = BASE_REGISTRY.call{gas: minGasLimit}(message);
        assertTrue(success, "setDelegationDigest failed");

        vm.prank(IERC173(BASE_REGISTRY).owner());
        MAINNET_DELEGATION.relayDelegations(encodedMsgs);

        // Step 3: Capture delegations AFTER cross-chain relaying
        DelegationAnalytics[] memory delegationsAfter = _captureDelegationAnalytics("AFTER");
        _exportDelegationsToCSV(delegationsAfter, "delegations_after_relay.csv");

        // Export comparison data
        _exportComparisonAnalytics(delegationsBefore, delegationsAfter);
    }

    function _ensureOutputDirExists() internal {
        if (!vm.exists(outDir)) {
            vm.createDir(outDir, true);
            console.log("Created output directory:", outDir);
        } else if (!vm.isDir(outDir)) {
            // If path exists but is not a directory, this is an error
            revert(string.concat("Output path exists but is not a directory: ", outDir));
        }
    }

    function _captureDelegationAnalytics(
        string memory phase
    ) internal view returns (DelegationAnalytics[] memory analytics) {
        address[] memory delegators = MAINNET_DELEGATION.getMainnetDelegators();
        analytics = new DelegationAnalytics[](delegators.length);

        console.log("=== Capturing Delegation Analytics -", phase, "===");
        console.log("Total delegators:", delegators.length);

        for (uint256 i; i < delegators.length; i++) {
            IMainnetDelegation.Delegation memory delegation = MAINNET_DELEGATION
                .getDelegationByDelegator(delegators[i]);

            uint256 depositId = MAINNET_DELEGATION.getDepositIdByDelegator(delegators[i]);
            address claimer = MAINNET_DELEGATION.getAuthorizedClaimer(delegators[i]);

            analytics[i] = DelegationAnalytics({
                delegator: delegation.delegator,
                operator: delegation.operator,
                quantity: delegation.quantity,
                delegationTime: delegation.delegationTime,
                claimer: claimer,
                depositId: depositId
            });
        }
    }

    function _exportDelegationsToCSV(
        DelegationAnalytics[] memory delegations,
        string memory filename
    ) internal {
        string memory csv = "Delegator,Operator,Quantity,DelegationTime,Claimer,DepositID\n";

        for (uint256 i; i < delegations.length; i++) {
            DelegationAnalytics memory delegation = delegations[i];
            string memory row = string.concat(
                delegation.delegator.toHexStringChecksummed(),
                ",",
                delegation.operator.toHexStringChecksummed(),
                ",",
                delegation.quantity.toString(),
                ",",
                delegation.delegationTime.toString(),
                ",",
                delegation.claimer.toHexStringChecksummed(),
                ",",
                delegation.depositId.toString(),
                "\n"
            );
            csv = string.concat(csv, row);
        }

        string memory filepath = string.concat(outDir, filename);
        vm.writeFile(filepath, csv);
        console.log("Exported", delegations.length, "delegations to", filepath);
    }

    function _exportComparisonAnalytics(
        DelegationAnalytics[] memory before,
        DelegationAnalytics[] memory after_
    ) internal {
        // Create summary comparison
        string memory summary = "Metric,Before,After,Change\n";

        // Total delegations count
        summary = string.concat(
            summary,
            _summaryRow(
                "TotalDelegations",
                before.length,
                after_.length,
                int256(after_.length) - int256(before.length)
            )
        );

        // Total quantity staked
        uint256 totalBefore;
        uint256 totalAfter;

        for (uint256 i; i < before.length; i++) {
            totalBefore += before[i].quantity;
        }

        for (uint256 i; i < after_.length; i++) {
            totalAfter += after_[i].quantity;
        }

        summary = string.concat(
            summary,
            _summaryRow(
                "TotalQuantityStaked",
                totalBefore,
                totalAfter,
                int256(totalAfter) - int256(totalBefore)
            )
        );

        // Count unique operators
        uint256 uniqueOperatorsBefore = _countUniqueOperators(before);
        uint256 uniqueOperatorsAfter = _countUniqueOperators(after_);

        summary = string.concat(
            summary,
            _summaryRow(
                "UniqueOperators",
                uniqueOperatorsBefore,
                uniqueOperatorsAfter,
                int256(uniqueOperatorsAfter) - int256(uniqueOperatorsBefore)
            )
        );

        string memory filepath = string.concat(outDir, "delegation_comparison_summary.csv");
        vm.writeFile(filepath, summary);
        console.log("Exported comparison summary to", filepath);

        // Export detailed changes
        _exportDetailedChanges(before, after_);
    }

    function _summaryRow(
        string memory metric,
        uint256 before,
        uint256 after_,
        int256 change
    ) internal pure returns (string memory) {
        return
            string.concat(
                metric,
                ",",
                before.toString(),
                ",",
                after_.toString(),
                ",",
                change.toString(),
                "\n"
            );
    }

    function _countUniqueOperators(
        DelegationAnalytics[] memory delegations
    ) internal returns (uint256) {
        if (delegations.length == 0) return 0;

        // Clear previous data
        _clear(operators);

        // Add all operators to the set
        for (uint256 i; i < delegations.length; i++) {
            operators.add(delegations[i].operator);
        }
        return operators.length();
    }

    function _clear(EnumerableSetLib.AddressSet storage set) private {
        address[] memory values = set.values();
        uint256 length = values.length;
        while (length > 0) {
            --length;
            set.remove(values[length]);
        }
    }

    function _exportDetailedChanges(
        DelegationAnalytics[] memory before,
        DelegationAnalytics[] memory after_
    ) internal {
        string
            memory changes = "ChangeType,Delegator,Operator,QuantityBefore,QuantityAfter,QuantityChange\n";

        // Clear and populate delegator sets
        _clear(beforeDelegators);
        _clear(afterDelegators);
        _populateDelegatorSets(before, after_);

        // Check for modifications and existing delegations
        for (uint256 i; i < before.length; i++) {
            address delegatorBefore = before[i].delegator;

            if (afterDelegators.contains(delegatorBefore)) {
                // Find the matching delegation in after array
                for (uint256 j; j < after_.length; j++) {
                    if (after_[j].delegator != delegatorBefore) continue;

                    // Check if anything changed
                    if (
                        before[i].operator != after_[j].operator ||
                        before[i].quantity != after_[j].quantity
                    ) {
                        changes = string.concat(
                            changes,
                            _changeRow(
                                "MODIFIED",
                                delegatorBefore,
                                after_[j].operator,
                                before[i].quantity,
                                after_[j].quantity
                            )
                        );
                    }
                    break;
                }
            } else {
                // Delegator was removed
                changes = string.concat(
                    changes,
                    _changeRow(
                        "REMOVED",
                        delegatorBefore,
                        before[i].operator,
                        before[i].quantity,
                        0
                    )
                );
            }
        }

        // Check for new delegations
        for (uint256 j; j < after_.length; j++) {
            address delegatorAfter = after_[j].delegator;

            if (!beforeDelegators.contains(delegatorAfter)) {
                changes = string.concat(
                    changes,
                    _changeRow("ADDED", delegatorAfter, after_[j].operator, 0, after_[j].quantity)
                );
            }
        }

        string memory filepath = string.concat(outDir, "delegation_detailed_changes.csv");
        vm.writeFile(filepath, changes);
        console.log("Exported detailed changes to", filepath);
    }

    function _populateDelegatorSets(
        DelegationAnalytics[] memory before,
        DelegationAnalytics[] memory after_
    ) private {
        for (uint256 i; i < before.length; i++) {
            beforeDelegators.add(before[i].delegator);
        }
        for (uint256 i; i < after_.length; i++) {
            afterDelegators.add(after_[i].delegator);
        }
    }

    function _changeRow(
        string memory changeType,
        address delegator,
        address operator,
        uint256 quantityBefore,
        uint256 quantityAfter
    ) internal pure returns (string memory) {
        return
            string.concat(
                changeType,
                ",",
                delegator.toHexStringChecksummed(),
                ",",
                operator.toHexStringChecksummed(),
                ",",
                quantityBefore.toString(),
                ",",
                quantityAfter.toString(),
                ",",
                (int256(quantityAfter) - int256(quantityBefore)).toString(),
                "\n"
            );
    }
}
