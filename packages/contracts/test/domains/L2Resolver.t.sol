// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IExtendedResolver} from "@ensdomains/ens-contracts/resolvers/profiles/IExtendedResolver.sol";
import {IAddrResolver} from "@ensdomains/ens-contracts/resolvers/profiles/IAddrResolver.sol";
import {ITextResolver} from "@ensdomains/ens-contracts/resolvers/profiles/ITextResolver.sol";
import {IContentHashResolver} from "@ensdomains/ens-contracts/resolvers/profiles/IContentHashResolver.sol";
import {IL2Registry} from "src/domains/facets/l2/IL2Registry.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

// libraries
import {L2RegistryMod} from "src/domains/facets/l2/modules/L2RegistryMod.sol";

// facets
import {L2RegistryFacet} from "src/domains/facets/l2/L2RegistryFacet.sol";
import {AddrResolverFacet} from "src/domains/facets/l2/AddrResolverFacet.sol";
import {TextResolverFacet} from "src/domains/facets/l2/TextResolverFacet.sol";
import {ExtendedResolverFacet} from "src/domains/facets/l2/ExtendedResolverFacet.sol";
import {ContentHashResolverFacet} from "src/domains/facets/l2/ContentHashResolverFacet.sol";

// test setup
import {L2ResolverBaseSetup} from "./setup/L2ResolverBaseSetup.sol";

/// @title L2ResolverTest
/// @notice Unit tests for L2 Resolver diamond
contract L2ResolverTest is L2ResolverBaseSetup {
    L2RegistryFacet internal l2Registry;
    AddrResolverFacet internal addrResolver;
    TextResolverFacet internal textResolver;
    ExtendedResolverFacet internal extendedResolver;
    ContentHashResolverFacet internal contentHashResolver;

    function setUp() public override {
        super.setUp();
        l2Registry = L2RegistryFacet(l2Resolver);
        addrResolver = AddrResolverFacet(l2Resolver);
        textResolver = TextResolverFacet(l2Resolver);
        extendedResolver = ExtendedResolverFacet(l2Resolver);
        contentHashResolver = ContentHashResolverFacet(l2Resolver);
    }

    /*//////////////////////////////////////////////////////////////
                            INITIALIZATION
    //////////////////////////////////////////////////////////////*/

    function test_initialization() external view {
        // Verify root domain was minted to deployer
        assertEq(l2Registry.domainOwner(), deployer, "Deployer should own root domain");

        // Verify only root domain NFT exists
        assertEq(l2Registry.totalSupply(), 1, "Total supply should be 1");

        // Verify resolver supports IExtendedResolver interface
        assertTrue(
            IERC165(l2Resolver).supportsInterface(type(IExtendedResolver).interfaceId),
            "Should support IExtendedResolver"
        );

        // Verify resolver supports IL2Registry interface
        assertTrue(
            IERC165(l2Resolver).supportsInterface(type(IL2Registry).interfaceId),
            "Should support IL2Registry"
        );

        // Verify resolver supports IContentHashResolver interface
        assertTrue(
            IERC165(l2Resolver).supportsInterface(type(IContentHashResolver).interfaceId),
            "Should support IContentHashResolver"
        );
    }

    function test_baseDomainHash() external view {
        assertEq(l2Registry.baseDomainHash(), rootNode, "Base domain hash should match rootNode");
    }

    function test_encodeSubdomain() external view {
        bytes32 expected = _subdomainHash("alice");
        bytes32 actual = l2Registry.encodeSubdomain(rootNode, "alice");
        assertEq(actual, expected, "Encoded subdomain should match expected hash");
    }

    function test_namehash() external view {
        bytes32 expected = _namehash("alice.towns.eth");
        assertEq(l2Registry.namehash("alice.towns.eth"), expected, "Namehash should match");
    }

    function test_decodeName() external view {
        bytes memory dnsEncoded = _dnsEncode("alice.towns.eth");
        string memory decoded = l2Registry.decodeName(dnsEncoded);
        assertEq(decoded, "alice.towns.eth", "Decoded name should match");
    }

    /*//////////////////////////////////////////////////////////////
                          SUBDOMAIN CREATION
    //////////////////////////////////////////////////////////////*/

    function test_createSubdomain() external {
        bytes32 aliceNode = _createSubdomain("alice", alice);

        // Verify NFT minted to alice
        assertEq(l2Registry.subdomainOwner(aliceNode), alice, "Alice should own subdomain");

        // Verify total supply increased
        assertEq(l2Registry.totalSupply(), 2, "Total supply should be 2");
    }

    function test_createSubdomain_registrar() external {
        // Add registrar
        vm.prank(deployer);
        l2Registry.addRegistrar(registrar);

        // Registrar creates subdomain
        bytes32 bobNode = _subdomainHash("bob");
        bytes[] memory records = new bytes[](0);

        vm.prank(registrar);
        l2Registry.createSubdomain(rootNode, "bob", bob, records, "");

        assertEq(l2Registry.subdomainOwner(bobNode), bob, "Bob should own subdomain");
    }

    function test_createSubdomain_withRecords() external {
        // Add registrar
        vm.prank(deployer);
        l2Registry.addRegistrar(registrar);

        // Prepare records to set during creation
        bytes32 aliceNode = _subdomainHash("alice");
        bytes[] memory records = new bytes[](1);
        records[0] = abi.encodeCall(
            TextResolverFacet.setText,
            (aliceNode, "avatar", "https://img.towns.com/alice.png")
        );

        // Registrar creates subdomain with inline records
        vm.prank(registrar);
        l2Registry.createSubdomain(rootNode, "alice", alice, records, "");

        // Verify text was set
        string memory storedText = textResolver.text(aliceNode, "avatar");
        assertEq(storedText, "https://img.towns.com/alice.png", "Text should be set");
    }

    function test_revertWhen_createSubdomain_notOwnerOrRegistrar() external {
        bytes[] memory records = new bytes[](0);

        vm.prank(alice);
        vm.expectRevert(L2RegistryMod.L2RegistryMod_NotOwnerOrRegistrar.selector);
        l2Registry.createSubdomain(rootNode, "alice", alice, records, "");
    }

    function test_revertWhen_createSubdomain_alreadyExists() external {
        _createSubdomain("alice", alice);

        bytes[] memory records = new bytes[](0);

        vm.prank(deployer);
        vm.expectRevert(L2RegistryMod.L2RegistryMod_NotAvailable.selector);
        l2Registry.createSubdomain(rootNode, "alice", bob, records, "");
    }

    function test_revertWhen_createSubdomain_withRecords_notRegistrar() external {
        // Documents that root domain owner CANNOT set inline records (only registrars can)
        bytes32 aliceNode = _subdomainHash("alice");
        bytes[] memory records = new bytes[](1);
        records[0] = abi.encodeCall(
            TextResolverFacet.setText,
            (aliceNode, "url", "https://alice.com")
        );

        // Deployer is owner but not registrar - inline records fail
        vm.prank(deployer);
        vm.expectRevert(L2RegistryMod.L2RegistryMod_SetRecordsFailed.selector);
        l2Registry.createSubdomain(rootNode, "alice", alice, records, "");
    }

    function test_revertWhen_createSubdomain_emptyLabel() external {
        bytes[] memory records = new bytes[](0);

        vm.prank(deployer);
        vm.expectRevert(L2RegistryMod.L2RegistryMod_LabelTooShort.selector);
        l2Registry.createSubdomain(rootNode, "", alice, records, "");
    }

    function test_revertWhen_createSubdomain_labelTooLong() external {
        // Create a label with 256 characters (max is 255)
        bytes memory longLabel = new bytes(256);
        for (uint256 i; i < 256; ++i) {
            longLabel[i] = "a";
        }

        bytes[] memory records = new bytes[](0);

        vm.prank(deployer);
        vm.expectRevert(L2RegistryMod.L2RegistryMod_LabelTooLong.selector);
        l2Registry.createSubdomain(rootNode, string(longLabel), alice, records, "");
    }

    function test_createSubdomain_nested() external {
        // Create alice.towns.eth
        bytes32 aliceNode = _createSubdomain("alice", alice);

        // Alice creates sub.alice.towns.eth
        bytes[] memory records = new bytes[](0);
        vm.prank(alice);
        l2Registry.createSubdomain(aliceNode, "sub", bob, records, "");

        // Verify nested subdomain
        bytes32 subNode = l2Registry.encodeSubdomain(aliceNode, "sub");
        assertEq(l2Registry.subdomainOwner(subNode), bob, "Bob should own nested subdomain");
        assertEq(l2Registry.totalSupply(), 3, "Total supply should be 3");
    }

    /*//////////////////////////////////////////////////////////////
                          REGISTRAR MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    function test_addRegistrar() external {
        vm.prank(deployer);
        l2Registry.addRegistrar(registrar);

        // Registrar can create subdomain
        bytes[] memory records = new bytes[](0);
        vm.prank(registrar);
        l2Registry.createSubdomain(rootNode, "test", alice, records, "");

        assertEq(l2Registry.totalSupply(), 2);
    }

    function test_removeRegistrar() external {
        vm.prank(deployer);
        l2Registry.addRegistrar(registrar);

        vm.prank(deployer);
        l2Registry.removeRegistrar(registrar);

        // Registrar can no longer create
        bytes[] memory records = new bytes[](0);
        vm.prank(registrar);
        vm.expectRevert(L2RegistryMod.L2RegistryMod_NotOwnerOrRegistrar.selector);
        l2Registry.createSubdomain(rootNode, "test", alice, records, "");
    }

    function test_revertWhen_addRegistrar_notOwner() external {
        vm.prank(alice);
        vm.expectRevert(L2RegistryMod.L2RegistryMod_NotOwner.selector);
        l2Registry.addRegistrar(registrar);
    }

    function test_revertWhen_removeRegistrar_notOwner() external {
        vm.prank(deployer);
        l2Registry.addRegistrar(registrar);

        vm.prank(alice);
        vm.expectRevert(L2RegistryMod.L2RegistryMod_NotOwner.selector);
        l2Registry.removeRegistrar(registrar);
    }

    /*//////////////////////////////////////////////////////////////
                               METADATA
    //////////////////////////////////////////////////////////////*/

    function test_createSubdomain_withMetadata() external {
        // Metadata can be anything - registrar interprets it (e.g., expiration, tier, etc.)
        bytes memory metadata = abi.encode(uint64(block.timestamp + 365 days), uint8(1));
        bytes32 aliceNode = _createSubdomainWithMetadata("alice", alice, metadata);

        assertEq(l2Registry.getMetadata(aliceNode), metadata, "Metadata should be set");
        assertEq(l2Registry.subdomainOwner(aliceNode), alice, "Alice should own subdomain");
    }

    function test_createSubdomain_withoutMetadata() external {
        bytes32 aliceNode = _createSubdomain("alice", alice);

        bytes memory storedMetadata = l2Registry.getMetadata(aliceNode);
        assertEq(storedMetadata.length, 0, "Metadata should be empty");
    }

    function test_setMetadata() external {
        bytes32 aliceNode = _createSubdomain("alice", alice);

        // Add registrar
        vm.prank(deployer);
        l2Registry.addRegistrar(registrar);

        // Registrar sets metadata
        bytes memory newMetadata = abi.encode(uint64(block.timestamp + 365 days));
        vm.prank(registrar);
        l2Registry.setMetadata(aliceNode, newMetadata);

        assertEq(l2Registry.getMetadata(aliceNode), newMetadata, "Metadata should be updated");
    }

    function test_revertWhen_setMetadata_notRegistrar() external {
        bytes32 aliceNode = _createSubdomain("alice", alice);

        bytes memory metadata = abi.encode(uint64(block.timestamp + 365 days));
        vm.prank(alice);
        vm.expectRevert(L2RegistryMod.L2RegistryMod_NotRegistrar.selector);
        l2Registry.setMetadata(aliceNode, metadata);
    }

    function test_setMetadata_overwrite() external {
        bytes memory initialMetadata = abi.encode(uint64(block.timestamp + 30 days));
        bytes32 aliceNode = _createSubdomainWithMetadata("alice", alice, initialMetadata);

        assertEq(l2Registry.getMetadata(aliceNode), initialMetadata);

        // Add registrar and overwrite metadata
        vm.prank(deployer);
        l2Registry.addRegistrar(registrar);

        bytes memory newMetadata = abi.encode(uint64(block.timestamp + 365 days));
        vm.prank(registrar);
        l2Registry.setMetadata(aliceNode, newMetadata);

        assertEq(l2Registry.getMetadata(aliceNode), newMetadata, "Metadata should be overwritten");
    }

    function test_getMetadata_nonexistent() external view {
        bytes32 nonexistentNode = keccak256("nonexistent");
        bytes memory metadata = l2Registry.getMetadata(nonexistentNode);

        assertEq(metadata.length, 0, "Nonexistent node should return empty metadata");
    }

    /*//////////////////////////////////////////////////////////////
                            ADDRESS RESOLVER
    //////////////////////////////////////////////////////////////*/

    function test_setAddr() external {
        bytes32 aliceNode = _createSubdomain("alice", alice);

        vm.prank(alice);
        addrResolver.setAddr(aliceNode, alice);

        address storedAddr = addrResolver.addr(aliceNode);
        assertEq(storedAddr, alice, "Address should match");
    }

    function test_setAddr_multiCoin() external {
        bytes32 aliceNode = _createSubdomain("alice", alice);
        bytes memory btcAddr = hex"0014abc123";

        vm.prank(alice);
        addrResolver.setAddr(aliceNode, 0, btcAddr); // BTC = coinType 0

        bytes memory storedAddr = addrResolver.addr(aliceNode, 0);
        assertEq(storedAddr, btcAddr, "BTC address should match");
    }

    function test_revertWhen_setAddr_notAuthorized() external {
        bytes32 aliceNode = _createSubdomain("alice", alice);

        vm.prank(bob);
        vm.expectRevert(L2RegistryMod.L2RegistryMod_NotAuthorized.selector);
        addrResolver.setAddr(aliceNode, bob);
    }

    function test_setAddr_overwrite() external {
        bytes32 aliceNode = _createSubdomain("alice", alice);

        // Set initial address
        vm.prank(alice);
        addrResolver.setAddr(aliceNode, alice);
        assertEq(addrResolver.addr(aliceNode), alice);

        // Overwrite with new address
        vm.prank(alice);
        addrResolver.setAddr(aliceNode, bob);
        assertEq(addrResolver.addr(aliceNode), bob, "Address should be overwritten");
    }

    function test_setAddr_approvedOperator() external {
        bytes32 aliceNode = _createSubdomain("alice", alice);
        uint256 tokenId = uint256(aliceNode);

        // Alice approves bob for this specific token
        vm.prank(alice);
        l2Registry.approve(bob, tokenId);

        // Bob can now set addr
        vm.prank(bob);
        addrResolver.setAddr(aliceNode, bob);

        assertEq(addrResolver.addr(aliceNode), bob, "Approved operator should set addr");
    }

    /*//////////////////////////////////////////////////////////////
                            TEXT RESOLVER
    //////////////////////////////////////////////////////////////*/

    function test_setText() external {
        bytes32 aliceNode = _createSubdomain("alice", alice);

        vm.prank(alice);
        textResolver.setText(aliceNode, "url", "https://alice.com");

        string memory storedText = textResolver.text(aliceNode, "url");
        assertEq(storedText, "https://alice.com", "Text should match");
    }

    function test_revertWhen_setText_notAuthorized() external {
        bytes32 aliceNode = _createSubdomain("alice", alice);

        vm.prank(bob);
        vm.expectRevert(L2RegistryMod.L2RegistryMod_NotAuthorized.selector);
        textResolver.setText(aliceNode, "url", "https://bob.com");
    }

    function test_setText_overwrite() external {
        bytes32 aliceNode = _createSubdomain("alice", alice);

        // Set initial text
        vm.prank(alice);
        textResolver.setText(aliceNode, "url", "https://alice.com");
        assertEq(textResolver.text(aliceNode, "url"), "https://alice.com");

        // Overwrite with new text
        vm.prank(alice);
        textResolver.setText(aliceNode, "url", "https://alice-new.com");
        assertEq(
            textResolver.text(aliceNode, "url"),
            "https://alice-new.com",
            "Text should be overwritten"
        );
    }

    function test_revertWhen_setText_approvedForAll() external {
        // Documents that setApprovalForAll does NOT authorize for records
        // Only specific token approval via approve() works
        bytes32 aliceNode = _createSubdomain("alice", alice);

        // Alice approves bob for all tokens
        vm.prank(alice);
        l2Registry.setApprovalForAll(bob, true);
        assertTrue(l2Registry.isApprovedForAll(alice, bob));

        // Bob still cannot set text - only approve() works for records
        vm.prank(bob);
        vm.expectRevert(L2RegistryMod.L2RegistryMod_NotAuthorized.selector);
        textResolver.setText(aliceNode, "url", "https://set-by-bob.com");
    }

    /*//////////////////////////////////////////////////////////////
                        CONTENTHASH RESOLVER
    //////////////////////////////////////////////////////////////*/

    function test_setContenthash() external {
        bytes32 aliceNode = _createSubdomain("alice", alice);

        // IPFS CIDv1 example: ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
        bytes
            memory ipfsHash = hex"e3010170122023e0160eec32d7875c1c3a86c0dd5d35a64f6a9f0eb7c0e3c3f7f79a0d6f5d3a";

        vm.prank(alice);
        contentHashResolver.setContenthash(aliceNode, ipfsHash);

        bytes memory storedHash = contentHashResolver.contenthash(aliceNode);
        assertEq(storedHash, ipfsHash, "Content hash should match");
    }

    function test_contenthash_empty() external {
        bytes32 aliceNode = _createSubdomain("alice", alice);

        bytes memory storedHash = contentHashResolver.contenthash(aliceNode);
        assertEq(storedHash.length, 0, "Content hash should be empty");
    }

    function test_setContenthash_overwrite() external {
        bytes32 aliceNode = _createSubdomain("alice", alice);

        bytes
            memory ipfsHash1 = hex"e3010170122023e0160eec32d7875c1c3a86c0dd5d35a64f6a9f0eb7c0e3c3f7f79a0d6f5d3a";
        bytes
            memory ipfsHash2 = hex"e30101701220abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567";

        // Set initial hash
        vm.prank(alice);
        contentHashResolver.setContenthash(aliceNode, ipfsHash1);
        assertEq(contentHashResolver.contenthash(aliceNode), ipfsHash1);

        // Overwrite with new hash
        vm.prank(alice);
        contentHashResolver.setContenthash(aliceNode, ipfsHash2);
        assertEq(
            contentHashResolver.contenthash(aliceNode),
            ipfsHash2,
            "Hash should be overwritten"
        );
    }

    function test_revertWhen_setContenthash_notAuthorized() external {
        bytes32 aliceNode = _createSubdomain("alice", alice);

        bytes
            memory ipfsHash = hex"e3010170122023e0160eec32d7875c1c3a86c0dd5d35a64f6a9f0eb7c0e3c3f7f79a0d6f5d3a";

        vm.prank(bob);
        vm.expectRevert(L2RegistryMod.L2RegistryMod_NotAuthorized.selector);
        contentHashResolver.setContenthash(aliceNode, ipfsHash);
    }

    /*//////////////////////////////////////////////////////////////
                          EXTENDED RESOLVER
    //////////////////////////////////////////////////////////////*/

    function test_resolve_addr() external {
        bytes32 aliceNode = _createSubdomain("alice", alice);

        vm.prank(alice);
        addrResolver.setAddr(aliceNode, alice);

        // Encode the addr call
        bytes memory data = abi.encodeCall(IAddrResolver.addr, (aliceNode));
        bytes memory name = _dnsEncode("alice.towns.eth");

        bytes memory result = extendedResolver.resolve(name, data);
        address decoded = abi.decode(result, (address));

        assertEq(decoded, alice, "Resolved address should match");
    }

    function test_resolve_text() external {
        bytes32 aliceNode = _createSubdomain("alice", alice);

        vm.prank(alice);
        textResolver.setText(aliceNode, "email", "alice@towns.com");

        // Encode the text call
        bytes memory data = abi.encodeCall(ITextResolver.text, (aliceNode, "email"));
        bytes memory name = _dnsEncode("alice.towns.eth");

        bytes memory result = extendedResolver.resolve(name, data);
        string memory decoded = abi.decode(result, (string));

        assertEq(decoded, "alice@towns.com", "Resolved text should match");
    }

    /*//////////////////////////////////////////////////////////////
                            ERC721 FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function test_balanceOf() external {
        assertEq(l2Registry.balanceOf(deployer), 1, "Deployer should have 1 token");
        assertEq(l2Registry.balanceOf(alice), 0, "Alice should have 0 tokens");

        _createSubdomain("alice", alice);
        assertEq(l2Registry.balanceOf(alice), 1, "Alice should have 1 token");

        _createSubdomain("alice2", alice);
        assertEq(l2Registry.balanceOf(alice), 2, "Alice should have 2 tokens");
    }

    function test_ownerOf() external {
        bytes32 aliceNode = _createSubdomain("alice", alice);
        uint256 tokenId = uint256(aliceNode);

        assertEq(l2Registry.ownerOf(tokenId), alice, "Alice should own token");
    }

    function test_transferFrom() external {
        bytes32 aliceNode = _createSubdomain("alice", alice);
        uint256 tokenId = uint256(aliceNode);

        vm.prank(alice);
        l2Registry.transferFrom(alice, bob, tokenId);

        assertEq(l2Registry.ownerOf(tokenId), bob, "Bob should own token after transfer");
    }

    function test_safeTransferFrom() external {
        bytes32 aliceNode = _createSubdomain("alice", alice);
        uint256 tokenId = uint256(aliceNode);

        vm.prank(alice);
        l2Registry.safeTransferFrom(alice, bob, tokenId);

        assertEq(l2Registry.ownerOf(tokenId), bob, "Bob should own token after safe transfer");
    }

    function test_safeTransferFrom_withData() external {
        bytes32 aliceNode = _createSubdomain("alice", alice);
        uint256 tokenId = uint256(aliceNode);

        vm.prank(alice);
        l2Registry.safeTransferFrom(alice, bob, tokenId, "test data");

        assertEq(l2Registry.ownerOf(tokenId), bob, "Bob should own token after safe transfer");
    }

    function test_approve() external {
        bytes32 aliceNode = _createSubdomain("alice", alice);
        uint256 tokenId = uint256(aliceNode);

        vm.prank(alice);
        l2Registry.approve(bob, tokenId);

        assertEq(l2Registry.getApproved(tokenId), bob, "Bob should be approved");
    }

    function test_getApproved() external {
        bytes32 aliceNode = _createSubdomain("alice", alice);
        uint256 tokenId = uint256(aliceNode);

        // No approval yet
        assertEq(l2Registry.getApproved(tokenId), address(0), "No one should be approved");

        vm.prank(alice);
        l2Registry.approve(bob, tokenId);

        assertEq(l2Registry.getApproved(tokenId), bob, "Bob should be approved");
    }

    function test_setApprovalForAll() external {
        vm.prank(alice);
        l2Registry.setApprovalForAll(bob, true);

        assertTrue(l2Registry.isApprovedForAll(alice, bob), "Bob should be approved for all");
    }

    function test_isApprovedForAll() external view {
        assertFalse(l2Registry.isApprovedForAll(alice, bob), "Bob should not be approved");
    }

    function test_revertWhen_transferFrom_notOwner() external {
        bytes32 aliceNode = _createSubdomain("alice", alice);
        uint256 tokenId = uint256(aliceNode);

        vm.prank(bob);
        vm.expectRevert();
        l2Registry.transferFrom(alice, bob, tokenId);
    }

    function test_revertWhen_ownerOf_nonexistent() external {
        uint256 nonexistentTokenId = uint256(keccak256("nonexistent"));

        vm.expectRevert();
        l2Registry.ownerOf(nonexistentTokenId);
    }

    function test_name() external view {
        assertEq(l2Registry.name(), "Towns Domain Registry");
    }

    function test_symbol() external view {
        assertEq(l2Registry.symbol(), "TDR");
    }

    function test_tokenURI() external {
        bytes32 aliceNode = _createSubdomain("alice", alice);
        uint256 tokenId = uint256(aliceNode);

        string memory uri = l2Registry.tokenURI(tokenId);

        // Should be a data URI with base64 encoded JSON
        assertTrue(bytes(uri).length > 0, "URI should not be empty");
        // Check it starts with data:application/json;base64,
        bytes memory prefix = bytes("data:application/json;base64,");
        for (uint256 i; i < prefix.length; ++i) {
            assertEq(bytes(uri)[i], prefix[i], "Should have correct prefix");
        }
    }
}
