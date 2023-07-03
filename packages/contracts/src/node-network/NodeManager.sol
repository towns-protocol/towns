//SPDX-License-Identifier: Apache-2.0

/******************************************************************************
 * Copyright 2022 Here Not There, Inc. <oss@hntlabs.com>                      *
 *                                                                            *
 * Licensed under the Apache License, Version 2.0 (the "License");            *
 * you may not use this file except in compliance with the License.           *
 * You may obtain a copy of the License at                                    *
 *                                                                            *
 *     http://www.apache.org/licenses/LICENSE-2.0                             *
 *                                                                            *
 * Unless required by applicable law or agreed to in writing, software        *
 * distributed under the License is distributed on an "AS IS" BASIS,          *
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.   *
 * See the License for the specific language governing permissions and        *
 * limitations under the License.                                             *
 ******************************************************************************/
pragma solidity 0.8.20;

import {Initializable} from "openzeppelin-contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/access/OwnableUpgradeable.sol";
import {AccessControlUpgradeable} from "openzeppelin-contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {UUPSUpgradeable, IERC1822ProxiableUpgradeable} from "openzeppelin-contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "openzeppelin-contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {FQDNRegex} from "./FQDNRegex.sol";

/**
 * @notice Contract to manage the regisration of Nodes into the Harmony network
 */
contract NodeManager is
  Initializable,
  UUPSUpgradeable,
  OwnableUpgradeable,
  AccessControlUpgradeable,
  ReentrancyGuardUpgradeable
{
  uint256 private constant NODE_STAKE = 10 ether;

  /// @notice Version constant used to prevent accidental downgrade
  uint16 private constant CONTRACT_VERSION = 1;

  /// @notice Current deployed version of the contract
  uint16 internal deployedContractVersion;

  /// @notice Emmited when a new Node is added to the network
  /// @dev All other nodes should start begin migrating content to this node when they receive this even onchain
  /// @param nodeHash Hash of the nodes public key
  event NewNode(uint256 nodeHash);

  /// @notice Emmited when a new Node requests to exit the network
  /// @dev All other nodes should start evacuation of data from this Node when they receive this even onchain
  /// @param nodeHash Hash of the nodes public key
  event NodeExitRequested(uint256 nodeHash);

  /// @notice Emmited when a new Node requests to crash exit the network
  /// @dev All other nodes should stop evacuation of data, this node is immediately exiting
  /// @param nodeHash Hash of the nodes public key
  event NodeCrashExited(uint256 nodeHash);

  /// @notice Emmited once all of the other Nodes have commited they have evacuated this Node
  /// @dev This Node is now in the Pending state
  /// @param nodeHash Hash of the nodes public key
  event NodeEvacuated(uint256 nodeHash);

  enum NodeState {
    UNINITIALIZED,
    PENDING,
    SERVING,
    EXITING
  }

  /**
   * @notice Emmited when a Node is unregistered and the stake is returned to the Owner
   * @param nodeHash Hash of the nodes public key
   */
  event NodeUnregistered(uint256 nodeHash);

  /**
   * @notice On chain Node state
   * @param owner Address of addresses allowed to make changes to the Nodes status
   * @param fqdn Fully Qualified Domain Name the Node may be publically reached at
   * @param nodeHash Hash of the nodes public key
   * @param state NodeState
   */
  struct Node {
    address owner;
    string fqdn;
    uint256 nodeHash;
    uint256 balance;
    NodeState state;
    ExitPeer[] peers;
  }

  enum PeerExitState {
    UNINITIALIZED,
    PENDING,
    COMPLETE,
    ABANDONED
  }

  struct ExitPeer {
    uint256 nodeHash;
    PeerExitState exitState;
  }

  /**
   * @notice Map of nodeHash to Node
   */
  mapping(uint256 => Node) public nodeHashToNode;
  uint256[] public nodes;

  /**
   * @dev Functon invoked in the implementation of the UUPSUpgradeable @openzeplin library.
   * Make sure all variables are properly intialized here
   */
  function initialize() public virtual initializer {
    __UUPSUpgradeable_init();
    __AccessControl_init();
    __Ownable_init();
    __ReentrancyGuard_init();

    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    deployedContractVersion = CONTRACT_VERSION;
  }

  /**
   * @notice Override supportsInterface to return true for AccessControlUpgradable and IERC1822ProxiableUpgradeable
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(AccessControlUpgradeable) returns (bool) {
    if (super.supportsInterface(interfaceId)) {
      return true;
    } else if (type(IERC1822ProxiableUpgradeable).interfaceId == interfaceId) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * @notice Return the version of this contract code, used to check and prevent accidental downgrading of contracts
   */
  function getContractVersion() public pure virtual returns (uint16) {
    return CONTRACT_VERSION;
  }

  /**
   * @notice Check that the upgrade is being performed by the contract owner
   * and that it isn't being downgraded to a prior version
   */
  function _authorizeUpgrade(
    address newImplementation
  ) internal view virtual override onlyOwner {
    NodeManager newContract = NodeManager(newImplementation);
    uint16 newVersion = newContract.getContractVersion();
    require(deployedContractVersion < newVersion, "Downgrade not allowed");
  }

  /**
   * @notice REMOVE
   */
  function test() public pure virtual returns (string memory) {
    return "Greetings from NodeManager";
  }

  /**
   * @notice Register a Node in the contract that will be providing Matrix services at the fqdn. The Node will be in the PENDING state
   * @param  nodeHash Sha256 hash of the Nodes public key
   * @param fqdn Fully Quailified Domain Name that the Node will be publically reachable at via HTTPS, using the keypair matching the nodeHashs
   */
  function registerNode(
    uint256 nodeHash,
    string calldata fqdn
  ) external payable nonReentrant {
    require(msg.value >= NODE_STAKE, "Must transfer at least NODE_STAKE");
    require(bytes(fqdn).length < 255, "fqdn length must be less than 255");
    require(FQDNRegex.matches((fqdn)), "fqdn must match regex");

    Node storage node = nodeHashToNode[nodeHash];
    require(node.owner == address(0), "Duplicate nodeHash");

    node.owner = msg.sender;
    node.fqdn = fqdn;
    node.nodeHash = nodeHash;
    node.balance = NODE_STAKE;
    node.state = NodeState.PENDING;
    nodes.push(nodeHash);
    uint256 ethToReturn = msg.value - NODE_STAKE;
    if (ethToReturn > 0) {
      payable(msg.sender).transfer(ethToReturn);
    }
  }

  /**
   * @notice Enroll the Node in the operating network. Node will be set to the Serving state. Validators will start checking this Nodes performance and slashing.
   * @dev Emites NewNode so other Nodes can start validating this node
   */
  function enrollNode(uint256 nodeHash) external {
    Node memory node = nodeHashToNode[nodeHash];
    require(node.owner != address(0), "Node not found");
    require(node.owner == msg.sender, "Must call from owning address");
    nodeHashToNode[nodeHash].state = NodeState.SERVING;
    emit NewNode(nodeHash);
  }

  /**
   * @notice Notify the network this Node would like to exit the network.
   * @dev Emites NewNode so other Nodes can start evacuating this node.
   */
  function nodeExit(uint256 nodeHash) external {
    Node memory node = nodeHashToNode[nodeHash];
    require(node.owner != address(0), "Node not found");
    require(node.owner == msg.sender, "Must call from owning address");
    uint256 nodesLength = nodes.length;
    for (uint256 p; p < nodesLength; ) {
      if (nodes[p] != nodeHash) {
        nodeHashToNode[nodeHash].peers.push(
          ExitPeer(nodes[p], PeerExitState.PENDING)
        );
      }
      unchecked {
        ++p;
      }
    }
    nodeHashToNode[nodeHash].state = NodeState.EXITING;
    emit NodeExitRequested(nodeHash);
  }

  /**
   * @notice Notify the network this Node is immediately existing the network. In progress evacuations as abandoned. Any remaining balance is slashed 90%.
   * @param nodeHash Hash of the nodes public key
   * @dev Emits NodeCrashExited so peer Nodes know they may stop evacuation in progress. Returns Node to PENDING state.
   */
  function nodeCrashExit(uint256 nodeHash) external nonReentrant {
    Node memory node = nodeHashToNode[nodeHash];
    require(node.owner != address(0), "Node not found");
    require(node.owner == msg.sender, "Must call from owning address");
    require(
      node.state == NodeState.EXITING,
      "Must only call for an EXITING Node"
    );

    uint256 peersLength = nodeHashToNode[nodeHash].peers.length;

    for (uint256 p; p < peersLength; ) {
      if (
        nodeHashToNode[nodeHash].peers[p].exitState != PeerExitState.COMPLETE
      ) {
        nodeHashToNode[nodeHash].peers[p].exitState = PeerExitState.ABANDONED;
      }
      unchecked {
        ++p;
      }
    }

    nodeHashToNode[nodeHash].balance = nodeHashToNode[nodeHash].balance / 10;
    nodeHashToNode[nodeHash].state = NodeState.PENDING;
    emit NodeCrashExited(nodeHash);
  }

  /**
   * @notice Notify the network that a node has copmleted it's responsibility of evacuating an exiting nodes data
   * @param exitingNodeHash Hash of the public key of the exiting node
   * @param confirmingNodeHash Hash of the public key of the node acknowledging it has recevied all of the exiting nodes data
   * @dev Emits NodeEvacuated when the final node acknowledges it has recevied all of the exiting nodes data and the node is free to call unregisterNode
   */
  function nodeEvacuationComplete(
    uint256 exitingNodeHash,
    uint256 confirmingNodeHash
  ) external {
    Node memory confirmingNode = nodeHashToNode[confirmingNodeHash];
    require(confirmingNode.owner != address(0), "Node not found");
    require(
      confirmingNode.owner == msg.sender,
      "Must call from owning address"
    );
    Node memory exitingNode = nodeHashToNode[exitingNodeHash];
    require(exitingNode.owner != address(0), "Node not found");
    require(
      exitingNode.state == NodeState.EXITING,
      "Must only call for a EXITING Node"
    );

    uint256 peersLength = exitingNode.peers.length;
    require(peersLength > 0, "Must only call with Peers");
    uint256 completedEvacuation;
    for (uint256 p; p < peersLength; ) {
      if (exitingNode.peers[p].nodeHash == confirmingNodeHash) {
        require(
          nodeHashToNode[exitingNodeHash].peers[p].exitState ==
            PeerExitState.PENDING,
          "Must call only when PeerExitState = PENDING"
        );

        nodeHashToNode[exitingNodeHash].peers[p].exitState = PeerExitState
          .COMPLETE;
      }
      if (
        nodeHashToNode[exitingNodeHash].peers[p].exitState ==
        PeerExitState.COMPLETE
      ) {
        ++completedEvacuation;
      }
      unchecked {
        ++p;
      }
    }
    if (nodeHashToNode[exitingNodeHash].peers.length == completedEvacuation) {
      nodeHashToNode[exitingNodeHash].state = NodeState.PENDING;
      emit NodeEvacuated(exitingNodeHash);
    }
  }

  /**
   * @dev Helper function to remove a node from the nodes array and adjust the positioin of the remainding nodes
   */
  function removeNode(uint256 nodeHash) private {
    uint256 index;
    bool found;

    for (; index < nodes.length; ++index) {
      if (nodes[index] == nodeHash) {
        found = true;
        break;
      }
    }
    if (found) {
      require(nodes.length > index, "Out of bounds");
      // move all elements to the left, starting from the `index + 1`
      for (uint256 i = index; i < nodes.length - 1; i++) {
        nodes[i] = nodes[i + 1];
      }
      nodes.pop(); // delete the last item
    }
  }

  /**
   * @notice Remove a Node from the network, either after all other nodes have acknoledged they have the data from this node, or it has crahsed out of the network
   * @param nodeHash Hash of the public key of the exiting node
   */
  function unregisterNode(uint256 nodeHash) external nonReentrant {
    Node memory node = nodeHashToNode[nodeHash];
    require(node.owner != address(0), "Node not found");
    require(node.owner == msg.sender, "Must call from owning address");
    require(
      node.state == NodeState.PENDING,
      "Must only call for a PENDING Node"
    );

    require(node.balance > 0, "Must only call for a Node with a balance");

    uint256 balance = nodeHashToNode[nodeHash].balance;
    address owner = payable(nodeHashToNode[nodeHash].owner);
    removeNode(nodeHash);
    delete nodeHashToNode[nodeHash].peers;
    delete nodeHashToNode[nodeHash];

    //slither-disable-next-line reentrancy-eth
    /* solhint-disable-next-line avoid-low-level-calls */
    (bool success, ) = owner.call{gas: 21000, value: balance}("");
    require(success, "Failed to transfer balance to owner");
    emit NodeUnregistered(nodeHash);
  }
}
