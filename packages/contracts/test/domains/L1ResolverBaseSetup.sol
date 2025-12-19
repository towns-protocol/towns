// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// libraries
import {NameCoder} from "@ensdomains/ens-contracts/utils/NameCoder.sol";

// contracts
import {TestUtils} from "@towns-protocol/diamond/test/TestUtils.sol";

// mocks
import {MockENS, MockAddrResolver, MockNameWrapper} from "test/mocks/domains/MockENS.sol";

// deployments
import {DeployL1Resolver} from "scripts/deployments/diamonds/DeployL1Resolver.s.sol";

/// @title L1ResolverBaseSetup
/// @notice Base setup for L1Resolver tests supporting both unit and fork testing
contract L1ResolverBaseSetup is TestUtils {
    // ENS protocol address (mainnet)
    address internal constant ENS_REGISTRY = 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e;

    // ENS name wrapper node
    bytes32 internal constant NAME_WRAPPER_NODE =
        0xdee478ba2734e34d81c6adc77a32d75b29007895efa2fe60921f1c315e1ec7d9;

    DeployL1Resolver internal deployL1Resolver;

    address internal deployer;
    address internal l1Resolver;

    // Test accounts
    uint256 internal signerPrivateKey;
    address internal signer;
    address internal domainOwner;
    address internal l2Registry;

    // Mock contracts (for unit tests)
    MockENS internal mockENS;
    MockNameWrapper internal mockNameWrapper;
    MockAddrResolver internal mockAddrResolver;

    // Test data
    string internal constant GATEWAY_URL = "https://gateway.test.com/{sender}/{data}";
    bytes32 internal testNode;
    uint64 internal constant TEST_CHAIN_ID = 8453; // Base

    function setUp() public virtual {
        deployer = getDeployer();
        signerPrivateKey = _randomUint256();
        signer = vm.addr(signerPrivateKey);
        domainOwner = _randomAddress();
        l2Registry = _randomAddress();

        // Calculate test node (namehash for "test.eth")
        testNode = _namehash("test.eth");

        deployL1Resolver = new DeployL1Resolver();
    }

    /// @notice Setup mocks for unit testing (injects bytecode at ENS addresses)
    function _setupMocks() internal {
        // Deploy mock contracts
        mockNameWrapper = new MockNameWrapper();
        mockAddrResolver = new MockAddrResolver(address(mockNameWrapper));
        mockENS = new MockENS();

        // Setup mock ENS with Name Wrapper resolver
        mockENS.setResolver(NAME_WRAPPER_NODE, address(mockAddrResolver));

        // Inject mock ENS bytecode at the hardcoded address
        vm.etch(ENS_REGISTRY, address(mockENS).code);

        // Copy storage from mockENS to ENS_REGISTRY
        // Set the resolver for NAME_WRAPPER_NODE
        bytes32 resolverSlot = keccak256(abi.encode(NAME_WRAPPER_NODE, uint256(1))); // slot 1 for resolvers mapping
        vm.store(ENS_REGISTRY, resolverSlot, bytes32(uint256(uint160(address(mockAddrResolver)))));
    }

    /// @notice Deploy L1Resolver with mocked ENS
    function _deployWithMocks() internal {
        _setupMocks();

        deployL1Resolver.setGatewayURL(GATEWAY_URL);
        deployL1Resolver.setGatewaySigner(signer);
        l1Resolver = deployL1Resolver.deploy(deployer);
    }

    /// @notice Setup domain ownership in mock ENS
    function _setDomainOwner(bytes32 node, address owner_) internal {
        // Update mock ENS storage at the hardcoded address
        bytes32 ownerSlot = keccak256(abi.encode(node, uint256(0))); // slot 0 for owners mapping
        vm.store(ENS_REGISTRY, ownerSlot, bytes32(uint256(uint160(owner_))));
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

    /// @notice Create signature for resolveWithProof
    function _signResponse(
        address target,
        uint64 expires,
        bytes memory request,
        bytes memory result
    ) internal view returns (bytes memory) {
        bytes32 hash = keccak256(
            abi.encodePacked(hex"1900", target, expires, keccak256(request), keccak256(result))
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, hash);
        return abi.encodePacked(r, s, v);
    }
}

