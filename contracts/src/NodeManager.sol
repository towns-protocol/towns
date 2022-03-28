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
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "hardhat/console.sol";
import "./FQDNRegex.sol";

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
    /// @dev All other nodes should start evacuaito of data from this Node when they receive this even onchain
    /// @param nodeHash Hash of the nodes public key
    event NodeExitRequested(uint256 nodeHash);

    /// @notice Emmited once all of the other Nodes have commited they have evacuated this Node
    /// @dev This Node is now in the Pending state
    /// @param nodeHash Hash of the nodes public key
    event NodeEvacuated(uint256 nodeHash);

    enum NodeState {
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
     *  @param state NodeState
     */
    struct Node {
        address owner;
        string fqdn;
        uint256 nodeHash;
        NodeState state;
    }

    /**
     * @notice Map of nodeHash to Node
     * @return owner Address of addresses allowed to make changes to the Nodes status
     * @return fqdn Fully Qualified Domain Name the Node may be publically reached at
     * @return nodeHash Hash of the nodes public key
     */
    mapping(uint256 => Node) public nodeHashToNode;

    /**
     * @notice Array of all of the registered Nodes
     */
    uint256[] public nodes;

    /**
     * @dev Functon invoked in the implementation of the UUPSUpgradeable @openzeplin library. Make sure all variables are properly intialized here
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
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControlUpgradeable)
        returns (bool)
    {
        if (super.supportsInterface(interfaceId)) {
            return true;
        } else if (
            type(IERC1822ProxiableUpgradeable).interfaceId == interfaceId
        ) {
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
     * @notice Check that the upgrade is being performed by the contract owner, and that it isn't being downgraded to a prior version
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        view
        virtual
        override
        onlyOwner
    {
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
    function registerNode(uint256 nodeHash, string calldata fqdn)
        external
        payable
        nonReentrant
    {
        require(msg.value >= NODE_STAKE, "Must transfer at least NODE_STAKE");
        require(bytes(fqdn).length < 255, "fqdn length must be less than 255");
        require(FQDNRegex.matches((fqdn)), "fqdn must match regex");
        uint256 nodesLength = nodes.length;

        for (uint256 n; n < nodesLength; ) {
            if (nodes[n] == nodeHash) {
                revert("Duplicate nodeHash");
            }
            unchecked {
                ++n;
            }
        }

        nodes.push(nodeHash);
        nodeHashToNode[nodeHash] = Node(
            msg.sender,
            fqdn,
            nodeHash,
            NodeState.PENDING
        );
        uint256 ethToReturn = msg.value - NODE_STAKE;
        if (ethToReturn > 0) {
            payable(msg.sender).transfer(ethToReturn);
        }
    }

    /**
     * @notice Enroll the Node in the operating network. Node will be set to the Serving state. Validators will start checking this Nodes performance and slashing.
     */
    function enrollNode(uint256 nodeHash) external {}

    function nodeExit(uint256 nodeHash) external {}

    function nodeCrashExit(uint256 nodeHash) external nonReentrant {}

    function nodeEvacuationComplete(
        uint256 exitingNodeHash,
        uint256 confirmingNodeHash
    ) external {}

    function unregisterNode(uint256 nodeHash, address payable)
        external
        nonReentrant
    {}
}
