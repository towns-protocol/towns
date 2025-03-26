// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {DeployBase} from "contracts/scripts/common/DeployBase.s.sol";
import {DeployStreamRegistry} from "contracts/scripts/deployments/facets/DeployStreamRegistry.s.sol";

//interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {IDiamondCut} from "@towns-protocol/diamond/src/facets/cut/IDiamondCut.sol";
import {IDiamondLoupe} from "@towns-protocol/diamond/src/facets/loupe/IDiamondLoupe.sol";
import {IERC173} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IStreamRegistry} from "contracts/src/river/registry/facets/stream/IStreamRegistry.sol";

//libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {Stream, StreamWithId, SetMiniblock} from "contracts/src/river/registry/libraries/RegistryStorage.sol";

//contracts
import {StreamRegistry} from "contracts/src/river/registry/facets/stream/StreamRegistry.sol";
import {TestUtils} from "@towns-protocol/diamond/test/TestUtils.sol";

contract ForkStreamRegistry is DeployBase, TestUtils, IDiamond {
  using EnumerableSet for EnumerableSet.AddressSet;
  using EnumerableSet for EnumerableSet.Bytes32Set;

  address internal riverRegistry;
  IStreamRegistry internal streamRegistry;
  DeployStreamRegistry internal streamRegistryDeployer;

  EnumerableSet.AddressSet internal ghostNodes;
  mapping(address => EnumerableSet.Bytes32Set) internal streamIdsByNode;

  function setUp() public {
    vm.createSelectFork("river", 12635400);

    vm.setEnv("DEPLOYMENT_CONTEXT", "omega");

    riverRegistry = getDeployment("riverRegistry");
    streamRegistry = IStreamRegistry(riverRegistry);
    streamRegistryDeployer = new DeployStreamRegistry();

    governanceActions();
  }

  function test_syncNodesOnStreams() public {
    uint256 stop = 200;
    (StreamWithId[] memory streams, ) = streamRegistry.getPaginatedStreams(
      0,
      stop
    );
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

    vm.startSnapshotGas("syncNodesOnStreams");
    // sync nodes
    streamRegistry.syncNodesOnStreams(0, stop);
    vm.stopSnapshotGas();

    // `getPaginatedStreamsOnNode` should return all streams after syncing
    for (uint256 i; i < _ghostNodes.length; ++i) {
      EnumerableSet.Bytes32Set storage streamIds = streamIdsByNode[
        _ghostNodes[i]
      ];
      assertEq(
        streamRegistry.getStreamCountOnNode(_ghostNodes[i]),
        streamIds.length()
      );

      StreamWithId[] memory streamsOnNode = streamRegistry
        .getPaginatedStreamsOnNode(_ghostNodes[i], 0, stop);
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
    bytes4[] memory functionSelectors = new bytes4[](2);
    functionSelectors[0] = StreamRegistry.getPaginatedStreamsOnNode.selector;
    functionSelectors[1] = StreamRegistry.syncNodesOnStreams.selector;
    FacetCut[] memory facetCuts = new FacetCut[](1);
    facetCuts[0] = FacetCut({
      facetAddress: impl,
      action: FacetCutAction.Add,
      functionSelectors: functionSelectors
    });

    address owner = IERC173(riverRegistry).owner();
    vm.prank(owner);
    IDiamondCut(riverRegistry).diamondCut(facetCuts, address(0), "");

    impl = address(new StreamRegistry());
    facetCuts[0] = streamRegistryDeployer.makeCut(impl, FacetCutAction.Replace);
    vm.prank(owner);
    IDiamondCut(riverRegistry).diamondCut(facetCuts, address(0), "");
  }
}
