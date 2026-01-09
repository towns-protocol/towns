// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// libraries
import {NameCoder} from "@ensdomains/ens-contracts/utils/NameCoder.sol";

// contracts
import {BaseSetup} from "test/spaces/BaseSetup.sol";

// facets
import {L2RegistryFacet} from "src/domains/facets/l2/L2RegistryFacet.sol";

// deployments
import {DeployL2Resolver} from "scripts/deployments/diamonds/DeployL2Resolver.s.sol";

/// @title L2ResolverBaseSetup
/// @notice Base setup for L2Resolver tests
contract L2ResolverBaseSetup is BaseSetup {
    // Constants
    string internal constant TEST_DOMAIN = "towns.eth";
    uint256 internal constant COIN_TYPE_ETH = 60;

    // Deployment
    DeployL2Resolver internal deployL2Resolver;
    address internal l2Resolver;

    // Test accounts

    address internal alice;
    address internal bob;
    address internal registrar;

    // Computed test data
    bytes32 internal rootNode;

    function setUp() public virtual override {
        // Setup test accounts
        super.setUp();

        alice = _randomAddress();
        bob = _randomAddress();
        registrar = _randomAddress();

        // Compute root node hash
        rootNode = _namehash(TEST_DOMAIN);

        // Deploy L2 Resolver diamond
        deployL2Resolver = new DeployL2Resolver();
        deployL2Resolver.setDomain(TEST_DOMAIN);
        l2Resolver = deployL2Resolver.deploy(deployer);
    }

    /// @notice Calculate namehash for a domain
    function _namehash(string memory name) internal pure returns (bytes32) {
        bytes memory dnsName = NameCoder.encode(name);
        return NameCoder.namehash(dnsName, 0);
    }

    /// @notice DNS-encode a name
    function _dnsEncode(string memory name) internal pure returns (bytes memory) {
        return NameCoder.encode(name);
    }

    /// @notice Calculate namehash for a subdomain under the root domain
    function _subdomainHash(string memory label) internal pure returns (bytes32) {
        string memory fullName = string.concat(label, ".", TEST_DOMAIN);
        return _namehash(fullName);
    }

    /// @notice Helper to create a subdomain under the root domain (no metadata)
    function _createSubdomain(string memory label, address owner) internal returns (bytes32 node) {
        return _createSubdomainWithMetadata(label, owner, "");
    }

    /// @notice Helper to create a subdomain with metadata
    function _createSubdomainWithMetadata(
        string memory label,
        address owner,
        bytes memory metadata
    ) internal returns (bytes32 node) {
        node = _subdomainHash(label);
        bytes[] memory records = new bytes[](0);

        vm.prank(deployer);
        L2RegistryFacet(l2Resolver).createSubdomain(rootNode, label, owner, records, metadata);
    }

    /// @notice Helper to create a subdomain with initial records (no metadata)
    function _createSubdomainWithRecords(
        string memory label,
        address owner,
        bytes[] memory records
    ) internal returns (bytes32 node) {
        node = _subdomainHash(label);

        vm.prank(deployer);
        L2RegistryFacet(l2Resolver).createSubdomain(rootNode, label, owner, records, "");
    }
}
