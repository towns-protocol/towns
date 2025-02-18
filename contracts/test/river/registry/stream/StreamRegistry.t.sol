// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IOwnableBase} from "@river-build/diamond/src/facets/ownable/IERC173.sol";

// libraries
import {Stream, StreamWithId, SetMiniblock} from "contracts/src/river/registry/libraries/RegistryStorage.sol";
import {RiverRegistryErrors} from "contracts/src/river/registry/libraries/RegistryErrors.sol";
import {IStreamRegistryBase} from "contracts/src/river/registry/facets/stream/IStreamRegistry.sol";
import {StreamFlags} from "contracts/src/river/registry/facets/stream/StreamRegistry.sol";

// deployments
import {RiverRegistryBaseSetup} from "contracts/test/river/registry/RiverRegistryBaseSetup.t.sol";

contract StreamRegistryTest is
  RiverRegistryBaseSetup,
  IOwnableBase,
  IStreamRegistryBase
{
  address internal NODE = makeAddr("node");
  address internal OPERATOR = makeAddr("operator");
  TestStream internal SAMPLE_STREAM =
    TestStream(
      bytes32(uint256(1234567890)),
      keccak256("genesisMiniblock"),
      "genesisMiniblock"
    );

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                       allocateStream                       */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function test_allocateStream()
    public
    givenNodeOperatorIsApproved(OPERATOR)
    givenNodeIsRegistered(OPERATOR, NODE, "url")
  {
    address[] memory nodeAddresses = new address[](1);
    nodeAddresses[0] = NODE;

    vm.prank(nodeAddresses[0]);
    streamRegistry.allocateStream(
      SAMPLE_STREAM.streamId,
      nodeAddresses,
      SAMPLE_STREAM.genesisMiniblockHash,
      SAMPLE_STREAM.genesisMiniblock
    );
  }

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

  function test_fuzz_allocateStream_revertWhen_streamIdAlreadyExists(
    TestStream memory testStream
  )
    external
    givenNodeOperatorIsApproved(OPERATOR)
    givenNodeIsRegistered(OPERATOR, NODE, "url")
  {
    address[] memory nodes = new address[](1);
    nodes[0] = NODE;

    vm.prank(NODE);
    streamRegistry.allocateStream(
      testStream.streamId,
      nodes,
      testStream.genesisMiniblockHash,
      testStream.genesisMiniblock
    );

    vm.prank(NODE);
    vm.expectRevert(bytes(RiverRegistryErrors.ALREADY_EXISTS));
    streamRegistry.allocateStream(
      testStream.streamId,
      nodes,
      testStream.genesisMiniblockHash,
      testStream.genesisMiniblock
    );
  }

  /// @notice This test is to ensure that the node who is calling the allocateStream function is registered.
  function test_fuzz_allocateStream_revertWhen_nodeNotRegistered(
    address node,
    TestStream memory testStream
  ) external givenNodeOperatorIsApproved(OPERATOR) {
    address[] memory nodes = new address[](1);
    nodes[0] = node;

    vm.prank(node);
    vm.expectRevert(bytes(RiverRegistryErrors.NODE_NOT_FOUND));
    streamRegistry.allocateStream(
      testStream.streamId,
      nodes,
      testStream.genesisMiniblockHash,
      testStream.genesisMiniblock
    );
  }

  /// @notice This test is to ensure that the nodes being passed in are registered before allocating a stream.
  function test_fuzz_allocateStream_revertWhen_nodesNotRegistered(
    address randomNode,
    TestNode memory node,
    TestStream memory testStream
  )
    external
    givenNodeOperatorIsApproved(OPERATOR)
    givenNodeIsRegistered(OPERATOR, node.node, node.url)
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

  function test_addStream()
    external
    givenNodeOperatorIsApproved(OPERATOR)
    givenNodeIsRegistered(OPERATOR, NODE, "url")
  {
    address[] memory nodeAddresses = new address[](1);
    nodeAddresses[0] = NODE;

    Stream memory streamToCreate = Stream({
      lastMiniblockHash: SAMPLE_STREAM.genesisMiniblockHash,
      lastMiniblockNum: 1,
      flags: StreamFlags.SEALED,
      reserved0: 0,
      nodes: nodeAddresses
    });

    vm.prank(nodeAddresses[0]);
    streamRegistry.addStream(
      SAMPLE_STREAM.streamId,
      SAMPLE_STREAM.genesisMiniblockHash,
      streamToCreate
    );
  }

  function test_fuzz_addStream(
    address nodeOperator,
    TestStream memory testStream,
    TestNode[100] memory nodes
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

  function test_fuzz_addStream_revertWhen_streamIdAlreadyExists(
    TestStream memory testStream,
    TestNode memory node
  )
    external
    givenNodeOperatorIsApproved(OPERATOR)
    givenNodeIsRegistered(OPERATOR, node.node, node.url)
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
  function test_fuzz_addStream_revertWhen_nodeNotRegistered(
    TestStream memory testStream,
    TestNode memory node
  ) external givenNodeOperatorIsApproved(OPERATOR) {
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
  function test_fuzz_addStream_revertWhen_nodesNotRegistered(
    address randomNode,
    TestStream memory testStream,
    TestNode memory node
  )
    external
    givenNodeOperatorIsApproved(OPERATOR)
    givenNodeIsRegistered(OPERATOR, node.node, node.url)
  {
    vm.assume(randomNode != node.node);

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

  function test_setStreamLastMiniblockBatch()
    external
    givenNodeOperatorIsApproved(OPERATOR)
    givenNodeIsRegistered(OPERATOR, NODE, "url")
  {
    address[] memory nodes = new address[](1);
    nodes[0] = NODE;

    vm.prank(NODE);
    streamRegistry.allocateStream(
      SAMPLE_STREAM.streamId,
      nodes,
      SAMPLE_STREAM.genesisMiniblockHash,
      SAMPLE_STREAM.genesisMiniblock
    );

    SetMiniblock[] memory miniblocks = new SetMiniblock[](1);
    miniblocks[0] = SetMiniblock({
      streamId: SAMPLE_STREAM.streamId,
      prevMiniBlockHash: bytes32(0),
      lastMiniblockHash: SAMPLE_STREAM.genesisMiniblockHash,
      lastMiniblockNum: 1,
      isSealed: false
    });

    vm.prank(NODE);
    streamRegistry.setStreamLastMiniblockBatch(miniblocks);
  }

  /// forge-config: default.fuzz.runs = 64
  function test_fuzz_setStreamLastMiniblockBatch(
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

    for (uint256 i; i < miniblocks.length; ++i) {
      vm.assume(!streamRegistry.isStream(miniblocks[i].streamId));

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

    for (uint256 i; i < miniblocks.length; ++i) {
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

  function test_setStreamLastMiniblockBatch_revertWhen_noMiniblocks()
    external
    givenNodeOperatorIsApproved(OPERATOR)
    givenNodeIsRegistered(OPERATOR, NODE, "url")
  {
    SetMiniblock[] memory miniblocks = new SetMiniblock[](0);

    vm.prank(NODE);
    vm.expectRevert(bytes(RiverRegistryErrors.BAD_ARG));
    streamRegistry.setStreamLastMiniblockBatch(miniblocks);
  }

  function test_fuzz_setStreamLastMiniblockBatch_revertWhen_streamNotFound(
    SetMiniblock memory miniblock,
    TestNode memory node
  )
    external
    givenNodeOperatorIsApproved(OPERATOR)
    givenNodeIsRegistered(OPERATOR, node.node, node.url)
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

  function test_fuzz_setStreamLastMiniblockBatch_revertWhen_streamSealed(
    TestNode memory node,
    TestStream memory testStream,
    SetMiniblock memory miniblock
  )
    external
    givenNodeOperatorIsApproved(OPERATOR)
    givenNodeIsRegistered(OPERATOR, node.node, node.url)
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

  function test_getStream() public {
    test_allocateStream();

    Stream memory stream = streamRegistry.getStream(SAMPLE_STREAM.streamId);
    assertEq(stream.lastMiniblockHash, SAMPLE_STREAM.genesisMiniblockHash);
  }

  function test_getStreamWithGenesis() public {
    test_allocateStream();

    (Stream memory stream, bytes32 genesisMiniblockHash, ) = streamRegistry
      .getStreamWithGenesis(SAMPLE_STREAM.streamId);
    assertEq(stream.lastMiniblockHash, SAMPLE_STREAM.genesisMiniblockHash);
    assertEq(genesisMiniblockHash, SAMPLE_STREAM.genesisMiniblockHash);
  }
}
