// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {DeployBase} from "scripts/common/DeployBase.s.sol";
import {DeployStreamRegistry} from "scripts/deployments/facets/DeployStreamRegistry.s.sol";

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {IDiamondCut} from "@towns-protocol/diamond/src/facets/cut/IDiamondCut.sol";
import {IDiamondLoupe} from "@towns-protocol/diamond/src/facets/loupe/IDiamondLoupe.sol";
import {IERC173} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IStreamRegistry} from "src/river/registry/facets/stream/IStreamRegistry.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {SetMiniblock, Stream, StreamWithId} from "src/river/registry/libraries/RegistryStorage.sol";

// contracts
import {TestUtils} from "@towns-protocol/diamond/test/TestUtils.sol";
import {StreamRegistry} from "src/river/registry/facets/stream/StreamRegistry.sol";

contract ForkStreamRegistry is DeployBase, TestUtils, IDiamond {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    address internal riverRegistry;
    IStreamRegistry internal streamRegistry;

    EnumerableSet.AddressSet internal ghostNodes;
    mapping(address => EnumerableSet.Bytes32Set) internal streamIdsByNode;

    function setUp() public {
        vm.createSelectFork("river", 12_635_400);

        vm.setEnv("DEPLOYMENT_CONTEXT", "omega");

        riverRegistry = getDeployment("riverRegistry");
        streamRegistry = IStreamRegistry(riverRegistry);

        governanceActions();
    }

    function test_syncNodesOnStreams() public {
        uint256 stop = 200;
        (StreamWithId[] memory streams, ) = streamRegistry.getPaginatedStreams(0, stop);
        for (uint256 i; i < stop; ++i) {
            StreamWithId memory stream = streams[i];
            address[] memory nodes = stream.stream.nodes;
            for (uint256 j; j < nodes.length; ++j) {
                ghostNodes.add(nodes[j]);
                streamIdsByNode[nodes[j]].add(stream.id);
            }
        }
        // `getStreamCountOnNode` should return nothing before syncing
        address[] memory _ghostNodes = ghostNodes.values();
        for (uint256 i; i < _ghostNodes.length; ++i) {
            assertEq(streamRegistry.getStreamCountOnNode(_ghostNodes[i]), 0);
        }

        streamRegistry.syncNodesOnStreams(0, stop);

        // `getPaginatedStreamsOnNode` should return all streams after syncing
        for (uint256 i; i < _ghostNodes.length; ++i) {
            EnumerableSet.Bytes32Set storage streamIds = streamIdsByNode[_ghostNodes[i]];
            assertEq(streamRegistry.getStreamCountOnNode(_ghostNodes[i]), streamIds.length());

            StreamWithId[] memory streamsOnNode = streamRegistry.getPaginatedStreamsOnNode(
                _ghostNodes[i],
                0,
                stop
            );
            assertEq(streamsOnNode.length, streamIds.length());

            for (uint256 j; j < streamsOnNode.length; ++j) {
                assertTrue(streamIds.contains(streamsOnNode[j].id));
            }
        }
    }

    function governanceActions() internal {
        address impl = IDiamondLoupe(riverRegistry).facetAddress(
            IStreamRegistry.allocateStream.selector
        );
        bytes4[] memory functionSelectors = IDiamondLoupe(riverRegistry).facetFunctionSelectors(
            impl
        );
        FacetCut[] memory facetCuts = new FacetCut[](1);
        facetCuts[0] = FacetCut({
            facetAddress: impl,
            action: FacetCutAction.Remove,
            functionSelectors: functionSelectors
        });

        address owner = IERC173(riverRegistry).owner();
        vm.prank(owner);
        IDiamondCut(riverRegistry).diamondCut(facetCuts, address(0), "");

        impl = address(new StreamRegistry());
        facetCuts[0] = DeployStreamRegistry.makeCut(impl, FacetCutAction.Add);
        vm.prank(owner);
        IDiamondCut(riverRegistry).diamondCut(facetCuts, address(0), "");
    }
}
