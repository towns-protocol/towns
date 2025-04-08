// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {Vm} from "forge-std/Vm.sol";

// libraries

import {IRiverConfigBase} from "contracts/src/river/registry/facets/config/IRiverConfig.sol";
import {IStreamRegistryBase} from "contracts/src/river/registry/facets/stream/IStreamRegistry.sol";
import {StreamFlags} from "contracts/src/river/registry/facets/stream/StreamRegistry.sol";
import {RiverRegistryErrors} from "contracts/src/river/registry/libraries/RegistryErrors.sol";
import {SetMiniblock, SetStreamReplicationFactor, Stream, StreamWithId} from "contracts/src/river/registry/libraries/RegistryStorage.sol";

import {LogUtils} from "contracts/test/utils/LogUtils.sol";

// deployments
import {RiverRegistryBaseSetup} from "contracts/test/river/registry/RiverRegistryBaseSetup.t.sol";

contract StreamRegistryTest is
    LogUtils,
    RiverRegistryBaseSetup,
    IOwnableBase,
    IRiverConfigBase,
    IStreamRegistryBase
{
    address internal NODE = makeAddr("node");
    address internal OPERATOR = makeAddr("operator");
    TestStream internal SAMPLE_STREAM =
        TestStream(
            bytes32(uint256(1_234_567_890)),
            keccak256("genesisMiniblock"),
            "genesisMiniblock"
        );

    modifier givenConfigurationManagerIsApproved(address configManager) {
        vm.assume(configManager != address(0));
        vm.assume(riverConfig.isConfigurationManager(configManager) == false);

        vm.prank(deployer);
        vm.expectEmit();
        emit ConfigurationManagerAdded(configManager);
        riverConfig.approveConfigurationManager(configManager);
        _;
    }

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

        // expect the deprecated event
        vm.expectEmit(address(streamRegistry));
        emit StreamAllocated(
            testStream.streamId,
            nodeAddresses,
            testStream.genesisMiniblockHash,
            testStream.genesisMiniblock
        );

        vm.recordLogs();
        vm.prank(nodes[0].node);

        streamRegistry.allocateStream(
            testStream.streamId,
            nodeAddresses,
            testStream.genesisMiniblockHash,
            testStream.genesisMiniblock
        );

        // get logs and check for StreamUpdated event
        Vm.Log memory streamUpdatedLog = _getFirstMatchingLog(
            vm.getRecordedLogs(),
            StreamUpdated.selector
        );

        // check event type (first topic should be the event signature, second is the indexed
        // eventType)
        assertEq(uint8(uint256(streamUpdatedLog.topics[1])), uint8(StreamEventType.Allocate));

        // decode the event data
        (bytes32 emittedStreamId, Stream memory emittedStream) = abi.decode(
            // decode the encoded `data` arg from the log data
            abi.decode(streamUpdatedLog.data, (bytes)),
            (bytes32, Stream)
        );

        Stream memory expectedStream = Stream({
            lastMiniblockHash: testStream.genesisMiniblockHash,
            lastMiniblockNum: 0,
            flags: 0,
            reserved0: uint64(nodeAddresses.length),
            nodes: nodeAddresses
        });

        assertEq(emittedStreamId, testStream.streamId);
        _assertEqStream(emittedStream, expectedStream);

        assertEq(streamRegistry.getStreamCount(), 1);
        assertEq(streamRegistry.getStreamCountOnNode(nodes[0].node), 1);
        assertTrue(streamRegistry.isStream(testStream.streamId));

        Stream memory stream = streamRegistry.getStream(testStream.streamId);
        _assertEqStream(stream, expectedStream);
    }

    function test_fuzz_allocateStream_revertWhen_streamIdAlreadyExists(
        TestStream memory testStream
    ) external givenNodeOperatorIsApproved(OPERATOR) givenNodeIsRegistered(OPERATOR, NODE, "url") {
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

    /// @notice This test is to ensure that the node who is calling the allocateStream function is
    /// registered.
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

    /// @notice This test is to ensure that the nodes being passed in are registered before
    /// allocating
    /// a stream.
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
            reserved0: 1,
            nodes: nodeAddresses
        });

        vm.prank(nodeAddresses[0]);
        streamRegistry.addStream(
            SAMPLE_STREAM.streamId,
            SAMPLE_STREAM.genesisMiniblockHash,
            streamToCreate
        );
    }

    /// forge-config: default.fuzz.runs = 64
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
            reserved0: 1,
            nodes: nodeAddresses
        });

        vm.expectEmit(address(streamRegistry));
        emit StreamCreated(testStream.streamId, testStream.genesisMiniblockHash, streamToCreate);

        vm.recordLogs();
        vm.prank(nodes[0].node);

        streamRegistry.addStream(
            testStream.streamId,
            testStream.genesisMiniblockHash,
            streamToCreate
        );

        Vm.Log memory streamUpdatedLog = _getFirstMatchingLog(
            vm.getRecordedLogs(),
            StreamUpdated.selector
        );

        assertEq(uint8(uint256(streamUpdatedLog.topics[1])), uint8(StreamEventType.Create));

        (bytes32 emittedStreamId, Stream memory emittedStream) = abi.decode(
            abi.decode(streamUpdatedLog.data, (bytes)),
            (bytes32, Stream)
        );

        assertEq(emittedStreamId, testStream.streamId);
        _assertEqStream(emittedStream, streamToCreate);

        assertEq(streamRegistry.getStreamCount(), 1);
        assertEq(streamRegistry.getStreamCountOnNode(nodes[0].node), 1);
        assertTrue(streamRegistry.isStream(testStream.streamId));

        Stream memory stream = streamRegistry.getStream(testStream.streamId);
        _assertEqStream(stream, streamToCreate);
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
            reserved0: 1,
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

    /// @notice This test is to ensure that the node who is calling the addStream function is
    /// registered.
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
            reserved0: 1,
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

    /// @notice This test is to ensure that the nodes being passed in are registered before
    /// allocating
    /// a stream.
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
            reserved0: 1,
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

        vm.expectEmit(address(streamRegistry));
        emit StreamLastMiniblockUpdated(
            miniblocks[0].streamId,
            miniblocks[0].lastMiniblockHash,
            miniblocks[0].lastMiniblockNum,
            miniblocks[0].isSealed
        );

        vm.recordLogs();
        vm.prank(NODE);
        streamRegistry.setStreamLastMiniblockBatch(miniblocks);

        Vm.Log memory streamUpdatedLog = _getFirstMatchingLog(
            vm.getRecordedLogs(),
            StreamUpdated.selector
        );

        assertEq(
            uint8(uint256(streamUpdatedLog.topics[1])),
            uint8(StreamEventType.LastMiniblockBatchUpdated)
        );

        assertEq(abi.decode(streamUpdatedLog.data, (bytes)), abi.encode(miniblocks));
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

        (StreamWithId[] memory streams, bool isLastPage) = streamRegistry.getPaginatedStreams(
            0,
            miniblocks.length
        );
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
        miniblock.lastMiniblockHash = bytes32(uint256(1_234_567_890));
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

    /// @notice Validates that `placeStreamOnNode` reverts if the node is not registered.
    function test_placeStreamOnNode_revertWhen_nodeNotRegistered() public {
        test_allocateStream();

        address unregisteredNode = makeAddr("unregisteredNode");

        vm.prank(unregisteredNode);
        vm.expectRevert(bytes(RiverRegistryErrors.NODE_NOT_FOUND));
        streamRegistry.placeStreamOnNode(SAMPLE_STREAM.streamId, unregisteredNode);
    }

    function test_placeStreamOnNode() public {
        // Add a valid stream first
        test_allocateStream();

        // Place this stream on a new node
        address newNode = makeAddr("newNode");
        _registerNode(OPERATOR, newNode, "newNodeUrl");

        vm.expectEmit(address(streamRegistry));
        emit StreamPlacementUpdated(SAMPLE_STREAM.streamId, newNode, true);

        vm.recordLogs();
        vm.prank(newNode);
        streamRegistry.placeStreamOnNode(SAMPLE_STREAM.streamId, newNode);

        Vm.Log memory streamUpdatedLog = _getFirstMatchingLog(
            vm.getRecordedLogs(),
            StreamUpdated.selector
        );

        assertEq(
            uint8(uint256(streamUpdatedLog.topics[1])),
            uint8(StreamEventType.PlacementUpdated)
        );

        (bytes32 emittedStreamId, Stream memory emittedStream) = abi.decode(
            abi.decode(streamUpdatedLog.data, (bytes)),
            (bytes32, Stream)
        );
        assertEq(emittedStreamId, SAMPLE_STREAM.streamId);

        Stream memory stream = streamRegistry.getStream(emittedStreamId);
        _assertEqStream(emittedStream, stream);

        assertEq(streamRegistry.getStreamCountOnNode(newNode), 1);
        assertEq(stream.nodes[1], newNode);
    }

    /// @notice Validates that `removeStreamFromNode` reverts if the stream is not on the node.
    function test_removeStreamFromNode_revertWhen_notOnNode() public {
        test_allocateStream();

        address anotherNode = makeAddr("anotherNode");

        _registerNode(OPERATOR, anotherNode, "anotherNodeUrl");

        vm.prank(anotherNode);
        vm.expectRevert(bytes(RiverRegistryErrors.NODE_NOT_FOUND));
        streamRegistry.removeStreamFromNode(SAMPLE_STREAM.streamId, anotherNode);
    }

    function test_removeStreamFromNode() public {
        // Add a valid stream first
        test_allocateStream();

        // Remove the stream from the node
        vm.expectEmit(address(streamRegistry));
        emit StreamPlacementUpdated(SAMPLE_STREAM.streamId, NODE, false);

        vm.recordLogs();
        vm.prank(NODE);
        streamRegistry.removeStreamFromNode(SAMPLE_STREAM.streamId, NODE);

        Vm.Log memory streamUpdatedLog = _getFirstMatchingLog(
            vm.getRecordedLogs(),
            StreamUpdated.selector
        );

        assertEq(
            uint8(uint256(streamUpdatedLog.topics[1])),
            uint8(StreamEventType.PlacementUpdated)
        );

        (bytes32 emittedStreamId, Stream memory emittedStream) = abi.decode(
            abi.decode(streamUpdatedLog.data, (bytes)),
            (bytes32, Stream)
        );
        assertEq(emittedStreamId, SAMPLE_STREAM.streamId);

        Stream memory stream = streamRegistry.getStream(emittedStreamId);
        _assertEqStream(emittedStream, stream);

        assertEq(streamRegistry.getStreamCountOnNode(NODE), 0);
        assertEq(stream.nodes.length, 0);
    }

    function test_initMigrateNonReplicatedStreamsToReplicated_3(
        address configManager
    ) public givenConfigurationManagerIsApproved(configManager) {
        // Add a valid stream first
        test_allocateStream();

        Stream memory stream = streamRegistry.getStream(SAMPLE_STREAM.streamId);

        address[] memory newNodes = new address[](3);
        newNodes[0] = stream.nodes[0]; // keep stream existing node
        newNodes[1] = makeAddr("replNode1");
        newNodes[2] = makeAddr("replNode2");

        uint8 replFactor = 1; // node 0 remains the only leader for this stream until other nodes
        // are
        // synced

        Stream memory expectedStream = Stream({
            lastMiniblockHash: stream.lastMiniblockHash,
            lastMiniblockNum: stream.lastMiniblockNum,
            reserved0: replFactor,
            flags: stream.flags,
            nodes: newNodes
        });

        vm.recordLogs();
        vm.prank(configManager);
        SetStreamReplicationFactor[] memory requests = new SetStreamReplicationFactor[](1);
        requests[0] = SetStreamReplicationFactor({
            streamId: SAMPLE_STREAM.streamId,
            nodes: newNodes,
            replicationFactor: replFactor
        });
        streamRegistry.setStreamReplicationFactor(requests);

        Vm.Log[] memory logs = vm.getRecordedLogs();

        // Verify StreamUpdated event
        Vm.Log memory streamUpdatedLog = _getFirstMatchingLog(logs, StreamUpdated.selector);

        assertEq(
            uint8(uint256(streamUpdatedLog.topics[1])),
            uint8(StreamEventType.PlacementUpdated)
        );

        assertEq(
            abi.decode(streamUpdatedLog.data, (bytes)),
            abi.encode(SAMPLE_STREAM.streamId, expectedStream)
        );
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         Getters                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

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

    function test_getPaginatedStreamsOnNode()
        public
        givenNodeOperatorIsApproved(OPERATOR)
        givenNodeIsRegistered(OPERATOR, NODE, "url")
    {
        _addStreams();

        StreamWithId[] memory streams = streamRegistry.getPaginatedStreamsOnNode(NODE, 0, 10);

        assertEq(streams.length, 10);
        for (uint256 i; i < streams.length; ++i) {
            assertEq(streams[i].id, bytes32(uint256(i)));
            assertEq(streams[i].stream.lastMiniblockHash, bytes32(uint256(i)));
        }
    }

    function test_getPaginatedStreams()
        public
        givenNodeOperatorIsApproved(OPERATOR)
        givenNodeIsRegistered(OPERATOR, NODE, "url")
    {
        _addStreams();

        (StreamWithId[] memory streams, bool isLastPage) = streamRegistry.getPaginatedStreams(
            0,
            10
        );

        assertEq(streams.length, 10);
        for (uint256 i; i < streams.length; ++i) {
            assertEq(streams[i].id, bytes32(uint256(i)));
            assertEq(streams[i].stream.lastMiniblockHash, bytes32(uint256(i)));
        }
        assertTrue(isLastPage);
    }

    function _addStreams() internal {
        Stream[] memory streams = new Stream[](10);
        for (uint256 i; i < streams.length; ++i) {
            streams[i] = Stream({
                lastMiniblockHash: bytes32(uint256(i)),
                lastMiniblockNum: 1,
                flags: StreamFlags.SEALED,
                reserved0: 1,
                nodes: new address[](1)
            });
            streams[i].nodes[0] = NODE;
            vm.prank(NODE);
            streamRegistry.addStream(bytes32(uint256(i)), bytes32(uint256(i)), streams[i]);
        }
    }

    function _assertEqStream(Stream memory stream, Stream memory expectedStream) internal pure {
        assertEq(abi.encode(stream), abi.encode(expectedStream));
    }
}
