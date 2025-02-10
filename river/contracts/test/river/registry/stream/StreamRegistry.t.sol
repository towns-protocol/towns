// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;
// interfaces
import {IOwnableBase} from "@river-build/diamond/src/facets/ownable/IERC173.sol";
// structs
// libraries
import {Stream, StreamWithId, SetMiniblock} from "contracts/src/river/registry/libraries/RegistryStorage.sol";
import {RiverRegistryErrors} from "contracts/src/river/registry/libraries/RegistryErrors.sol";
import {IStreamRegistryBase} from "contracts/src/river/registry/facets/stream/IStreamRegistry.sol";
import {StreamFlags} from "contracts/src/river/registry/facets/stream/StreamRegistry.sol";
// contracts
// deployments
import {RiverRegistryBaseSetup} from "contracts/test/river/registry/RiverRegistryBaseSetup.t.sol";

contract StreamRegistryTest is
  RiverRegistryBaseSetup,
  IOwnableBase,
  IStreamRegistryBase
{
  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                       allocateStream                       */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// forge-config: default.fuzz.runs = 64
  function test_fuzz_allocateStream(
    address nodeOperator,
    TestNode[100] memory nodes,
    TestStream memory testStream
  )
    external
    givenNodeOperatorIsApproved(nodeOperator)
    givenNodesAreRegistered(nodeOperator, nodes)
  {
    address[] memory nodeAddresses = new address[](nodes.length);
    uint256 nodesLength = nodes.length;
    for (uint256 i; i < nodesLength; ++i) {
      nodeAddresses[i] = nodes[i].node;
    }

    vm.prank(nodes[0].node);
    vm.expectEmit(address(streamRegistry));
    emit StreamAllocated(
      testStream.streamId,
      nodeAddresses,
      testStream.genesisMiniblockHash,
      testStream.genesisMiniblock
    );
    streamRegistry.allocateStream(
      testStream.streamId,
      nodeAddresses,
      testStream.genesisMiniblockHash,
      testStream.genesisMiniblock
    );

    assertEq(streamRegistry.getStreamCount(), 1);
    assertEq(streamRegistry.getStreamCountOnNode(nodes[0].node), 1);
    assertTrue(streamRegistry.isStream(testStream.streamId));

    Stream memory stream = streamRegistry.getStream(testStream.streamId);
    assertEq(stream.lastMiniblockHash, testStream.genesisMiniblockHash);
    assertEq(stream.nodes.length, nodesLength);
    assertContains(stream.nodes, nodes[0].node);
  }

  function test_revertWhen_allocateStream_streamIdAlreadyExists(
    address nodeOperator,
    TestNode memory node,
    TestStream memory testStream
  )
    external
    givenNodeOperatorIsApproved(nodeOperator)
    givenNodeIsRegistered(nodeOperator, node.node, node.url)
  {
    address[] memory nodes = new address[](1);
    nodes[0] = node.node;

    vm.prank(node.node);
    streamRegistry.allocateStream(
      testStream.streamId,
      nodes,
      testStream.genesisMiniblockHash,
      testStream.genesisMiniblock
    );

    vm.prank(node.node);
    vm.expectRevert(bytes(RiverRegistryErrors.ALREADY_EXISTS));
    streamRegistry.allocateStream(
      testStream.streamId,
      nodes,
      testStream.genesisMiniblockHash,
      testStream.genesisMiniblock
    );
  }

  /// @notice This test is to ensure that the node who is calling the allocateStream function is registered.
  function test_revertWhen_allocateStream_nodeNotRegistered(
    address nodeOperator,
    TestNode memory node,
    TestStream memory testStream
  ) external givenNodeOperatorIsApproved(nodeOperator) {
    address[] memory nodes = new address[](1);
    nodes[0] = node.node;

    vm.prank(node.node);
    vm.expectRevert(bytes(RiverRegistryErrors.NODE_NOT_FOUND));
    streamRegistry.allocateStream(
      testStream.streamId,
      nodes,
      testStream.genesisMiniblockHash,
      testStream.genesisMiniblock
    );
  }

  /// @notice This test is to ensure that the nodes being passed in are registered before allocating a stream.
  function test_revertWhen_allocateStream_nodesNotRegistered(
    address nodeOperator,
    address randomNode,
    TestNode memory node,
    TestStream memory testStream
  )
    external
    givenNodeOperatorIsApproved(nodeOperator)
    givenNodeIsRegistered(nodeOperator, node.node, node.url)
  {
    vm.assume(randomNode != node.node);
    address[] memory nodes = new address[](2);
    nodes[0] = node.node;
    nodes[1] = randomNode;

    vm.prank(node.node);
    vm.expectRevert(bytes(RiverRegistryErrors.NODE_NOT_FOUND));
    streamRegistry.allocateStream(
      testStream.streamId,
      nodes,
      testStream.genesisMiniblockHash,
      testStream.genesisMiniblock
    );
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                       addStream                            */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
  function test_fuzz_addStream(
    address nodeOperator,
    TestStream memory testStream,
    TestNode[100] memory nodes
  )
    external
    givenNodeOperatorIsApproved(nodeOperator)
    givenNodesAreRegistered(nodeOperator, nodes)
  {
    vm.assume(nodes.length > 0 && nodes.length <= 100);

    address[] memory nodeAddresses = new address[](nodes.length);
    uint256 nodesLength = nodes.length;
    for (uint256 i; i < nodesLength; ++i) {
      nodeAddresses[i] = nodes[i].node;
    }

    Stream memory streamToCreate = Stream({
      lastMiniblockHash: testStream.genesisMiniblockHash,
      lastMiniblockNum: 1,
      flags: StreamFlags.SEALED,
      reserved0: 0,
      nodes: nodeAddresses
    });

    vm.prank(nodes[0].node);
    vm.expectEmit(address(streamRegistry));
    emit StreamCreated(
      testStream.streamId,
      testStream.genesisMiniblockHash,
      streamToCreate
    );
    streamRegistry.addStream(
      testStream.streamId,
      testStream.genesisMiniblockHash,
      streamToCreate
    );

    assertEq(streamRegistry.getStreamCount(), 1);
    assertEq(streamRegistry.getStreamCountOnNode(nodes[0].node), 1);
    assertTrue(streamRegistry.isStream(testStream.streamId));

    Stream memory stream = streamRegistry.getStream(testStream.streamId);
    assertEq(stream.lastMiniblockHash, testStream.genesisMiniblockHash);
    assertEq(stream.nodes.length, nodesLength);
    assertContains(stream.nodes, nodes[0].node);
  }

  function test_revertWhen_addStream_streamIdAlreadyExists(
    address nodeOperator,
    TestStream memory testStream,
    TestNode memory node
  )
    external
    givenNodeOperatorIsApproved(nodeOperator)
    givenNodeIsRegistered(nodeOperator, node.node, node.url)
  {
    address[] memory nodes = new address[](1);
    nodes[0] = node.node;
    Stream memory streamToCreate = Stream({
      lastMiniblockHash: testStream.genesisMiniblockHash,
      lastMiniblockNum: 1,
      flags: StreamFlags.SEALED,
      reserved0: 0,
      nodes: nodes
    });

    vm.prank(node.node);
    streamRegistry.addStream(
      testStream.streamId,
      testStream.genesisMiniblockHash,
      streamToCreate
    );

    vm.prank(node.node);
    vm.expectRevert(bytes(RiverRegistryErrors.ALREADY_EXISTS));
    streamRegistry.addStream(
      testStream.streamId,
      testStream.genesisMiniblockHash,
      streamToCreate
    );
  }

  /// @notice This test is to ensure that the node who is calling the addStream function is registered.
  function test_revertWhen_addStream_nodeNotRegistered(
    address nodeOperator,
    TestStream memory testStream,
    TestNode memory node
  ) external givenNodeOperatorIsApproved(nodeOperator) {
    address[] memory nodes = new address[](1);
    nodes[0] = node.node;
    Stream memory streamToCreate = Stream({
      lastMiniblockHash: testStream.genesisMiniblockHash,
      lastMiniblockNum: 1,
      flags: StreamFlags.SEALED,
      reserved0: 0,
      nodes: nodes
    });

    vm.prank(node.node);
    vm.expectRevert(bytes(RiverRegistryErrors.NODE_NOT_FOUND));
    streamRegistry.addStream(
      testStream.streamId,
      testStream.genesisMiniblockHash,
      streamToCreate
    );
  }

  /// @notice This test is to ensure that the nodes being passed in are registered before allocating a stream.
  function test_revertWhen_addStream_nodesNotRegistered(
    address nodeOperator,
    address randomNode,
    TestStream memory testStream,
    TestNode memory node
  )
    external
    givenNodeOperatorIsApproved(nodeOperator)
    givenNodeIsRegistered(nodeOperator, node.node, node.url)
  {
    address[] memory nodes = new address[](2);
    nodes[0] = node.node;
    nodes[1] = randomNode;
    Stream memory streamToCreate = Stream({
      lastMiniblockHash: testStream.genesisMiniblockHash,
      lastMiniblockNum: 1,
      flags: StreamFlags.SEALED,
      reserved0: 0,
      nodes: nodes
    });

    vm.prank(node.node);
    vm.expectRevert(bytes(RiverRegistryErrors.NODE_NOT_FOUND));
    streamRegistry.addStream(
      testStream.streamId,
      testStream.genesisMiniblockHash,
      streamToCreate
    );
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                 setStreamLastMiniblockBatch                */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// forge-config: default.fuzz.runs = 64
  function test_setStreamLastMiniblockBatch(
    address nodeOperator,
    bytes32 genesisMiniblockHash,
    bytes memory genesisMiniblock,
    SetMiniblock[256] memory miniblocks,
    TestNode memory node
  )
    external
    givenNodeOperatorIsApproved(nodeOperator)
    givenNodeIsRegistered(nodeOperator, node.node, node.url)
  {
    address[] memory nodes = new address[](1);
    nodes[0] = node.node;

    for (uint256 i = 0; i < miniblocks.length; i++) {
      vm.assume(streamRegistry.isStream(miniblocks[i].streamId) == false);

      vm.prank(node.node);
      streamRegistry.allocateStream(
        miniblocks[i].streamId,
        nodes,
        genesisMiniblockHash,
        genesisMiniblock
      );
    }

    SetMiniblock[] memory _miniblocks = new SetMiniblock[](miniblocks.length);
    for (uint256 i; i < miniblocks.length; ++i) {
      _miniblocks[i] = miniblocks[i];
      _miniblocks[i].lastMiniblockNum = 1;
    }

    vm.prank(node.node);
    streamRegistry.setStreamLastMiniblockBatch(_miniblocks);

    for (uint256 i = 0; i < miniblocks.length; i++) {
      assertEq(
        streamRegistry.getStream(miniblocks[i].streamId).lastMiniblockHash,
        miniblocks[i].lastMiniblockHash
      );
    }

    (StreamWithId[] memory streams, bool isLastPage) = streamRegistry
      .getPaginatedStreams(0, miniblocks.length);
    assertEq(streams.length, miniblocks.length);
    assertTrue(isLastPage);
  }

  function test_revertWhen_setStreamLastMiniblockBatch_noMiniblocks(
    address nodeOperator,
    TestNode memory node
  )
    external
    givenNodeOperatorIsApproved(nodeOperator)
    givenNodeIsRegistered(nodeOperator, node.node, node.url)
  {
    SetMiniblock[] memory miniblocks = new SetMiniblock[](0);

    vm.prank(node.node);
    vm.expectRevert(bytes(RiverRegistryErrors.BAD_ARG));
    streamRegistry.setStreamLastMiniblockBatch(miniblocks);
  }

  function test_revertWhen_setStreamLastMiniblockBatch_streamNotFound(
    address nodeOperator,
    SetMiniblock memory miniblock,
    TestNode memory node
  )
    external
    givenNodeOperatorIsApproved(nodeOperator)
    givenNodeIsRegistered(nodeOperator, node.node, node.url)
  {
    SetMiniblock[] memory miniblocks = new SetMiniblock[](1);
    miniblocks[0] = miniblock;

    vm.prank(node.node);
    vm.expectEmit(address(streamRegistry));
    emit StreamLastMiniblockUpdateFailed(
      miniblock.streamId,
      miniblock.lastMiniblockHash,
      miniblock.lastMiniblockNum,
      RiverRegistryErrors.NOT_FOUND
    );
    streamRegistry.setStreamLastMiniblockBatch(miniblocks);
  }

  function test_revertWhen_setStreamLastMiniblockBatch_streamSealed(
    address nodeOperator,
    TestNode memory node,
    TestStream memory testStream,
    SetMiniblock memory miniblock
  )
    external
    givenNodeOperatorIsApproved(nodeOperator)
    givenNodeIsRegistered(nodeOperator, node.node, node.url)
  {
    address[] memory nodes = new address[](1);
    nodes[0] = node.node;

    vm.prank(node.node);
    streamRegistry.allocateStream(
      testStream.streamId,
      nodes,
      testStream.genesisMiniblockHash,
      testStream.genesisMiniblock
    );

    SetMiniblock[] memory miniblocks = new SetMiniblock[](1);
    miniblock.isSealed = true;
    miniblock.streamId = testStream.streamId;
    miniblock.lastMiniblockNum = 1;
    miniblock.lastMiniblockHash = bytes32(uint256(1234567890));
    miniblocks[0] = miniblock;

    vm.prank(node.node);
    streamRegistry.setStreamLastMiniblockBatch(miniblocks);

    vm.prank(node.node);
    vm.expectEmit(address(streamRegistry));
    emit StreamLastMiniblockUpdateFailed(
      miniblock.streamId,
      miniblock.lastMiniblockHash,
      miniblock.lastMiniblockNum,
      RiverRegistryErrors.STREAM_SEALED
    );
    streamRegistry.setStreamLastMiniblockBatch(miniblocks);
  }
}
