//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "hardhat/console.sol";

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
     */
    struct Node {
        address owner;
        string fqdn;
        uint256 nodeHash;
    }

    /**
     * @notice Map of Fully Qualified Domain Name to Node
     * @return owner Address of addresses allowed to make changes to the Nodes status
     * @return fqdn Fully Qualified Domain Name the Node may be publically reached at
     * @return nodeHash Hash of the nodes public key
     */
    mapping(string => Node) public fqdnToHash;

    /**
     * @dev Functon invoked by the Initializable function in the @openzeplin library. Make sure all variables are properly intialized here
     */
    function initialize() public virtual initializer {
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __Ownable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        deployedContractVersion = CONTRACT_VERSION;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControlUpgradeable)
        returns (bool)
    {
        if (super.supportsInterface(interfaceId)) {
            return true;
        } else {
            return
                interfaceId == type(IERC1822ProxiableUpgradeable).interfaceId;
        }
    }

    function getContractVersion() public pure virtual returns (uint16) {
        return CONTRACT_VERSION;
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        view
        virtual
        override
        onlyOwner
    {
        NodeManager newContract = NodeManager(newImplementation);
        uint16 newVersion = newContract.getContractVersion();
        require(deployedContractVersion < newVersion, "NO_DOWNGRADE");
    }

    function test() public pure virtual returns (string memory) {
        return "Greetings from NodeManager";
    }

    function rsegisterNode(uint256 nodeHash, string calldata fqdn)
        external
        payable
        nonReentrant
    {
        fqdnToHash[fqdn] = Node(msg.sender, fqdn, nodeHash);
    }

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
