// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IL2Registrar} from "src/domains/facets/registrar/IL2Registrar.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

// libraries
import {L2RegistrarMod} from "src/domains/facets/registrar/L2RegistrarMod.sol";

// facets
import {L2RegistryFacet} from "src/domains/facets/l2/L2RegistryFacet.sol";
import {L2RegistrarFacet} from "src/domains/facets/registrar/L2RegistrarFacet.sol";
import {AddrResolverFacet} from "src/domains/facets/l2/AddrResolverFacet.sol";

// test setup
import {L2ResolverBaseSetup} from "./setup/L2ResolverBaseSetup.sol";

// deployments
import {DeployL2Registrar} from "scripts/deployments/diamonds/DeployL2Registrar.s.sol";

/// @title L2RegistrarTest
/// @notice Unit tests for L2 Registrar diamond
contract L2RegistrarTest is L2ResolverBaseSetup {
    // Deployments
    DeployL2Registrar internal deployL2Registrar;
    address internal registrarDiamond;

    // Typed facet references
    L2RegistrarFacet internal l2Registrar;
    L2RegistryFacet internal l2Registry;
    AddrResolverFacet internal addrResolver;

    // Constants
    uint256 internal constant COIN_TYPE_BASE = 0x80000000 | 31337; // anvil chainId

    function setUp() public override {
        super.setUp(); // Deploys L2Resolver

        // Deploy L2Registrar diamond pointing to l2Resolver
        deployL2Registrar = new DeployL2Registrar();
        deployL2Registrar.setRegistry(l2Resolver);
        registrarDiamond = deployL2Registrar.deploy(deployer);

        // Setup typed references
        l2Registrar = L2RegistrarFacet(registrarDiamond);
        l2Registry = L2RegistryFacet(l2Resolver);
        addrResolver = AddrResolverFacet(l2Resolver);

        // Add registrar diamond as authorized registrar in L2Registry
        vm.prank(deployer);
        l2Registry.addRegistrar(registrarDiamond);
    }

    /*//////////////////////////////////////////////////////////////
                            INITIALIZATION
    //////////////////////////////////////////////////////////////*/

    function test_initialization() external view {
        // Verify registrar points to correct registry
        assertEq(l2Registrar.getRegistry(), l2Resolver, "Registry should be l2Resolver");

        // Verify coinType is correctly computed
        assertEq(l2Registrar.getCoinType(), COIN_TYPE_BASE, "CoinType should match");

        // Verify interface support
        assertTrue(
            IERC165(registrarDiamond).supportsInterface(type(IL2Registrar).interfaceId),
            "Should support IL2Registrar"
        );
    }

    function test_getRegistry() external view {
        assertEq(l2Registrar.getRegistry(), l2Resolver);
    }

    function test_getCoinType() external view {
        assertEq(l2Registrar.getCoinType(), COIN_TYPE_BASE);
    }

    /*//////////////////////////////////////////////////////////////
                          LABEL VALIDATION
    //////////////////////////////////////////////////////////////*/

    function test_isValidLabel_valid() external view {
        assertTrue(l2Registrar.isValidLabel("alice"));
        assertTrue(l2Registrar.isValidLabel("bob123"));
        assertTrue(l2Registrar.isValidLabel("my-name"));
        assertTrue(l2Registrar.isValidLabel("a1b"));
        assertTrue(l2Registrar.isValidLabel("abc"));
    }

    function test_isValidLabel_tooShort() external view {
        assertFalse(l2Registrar.isValidLabel("ab"));
        assertFalse(l2Registrar.isValidLabel("a"));
        assertFalse(l2Registrar.isValidLabel(""));
    }

    function test_isValidLabel_tooLong() external view {
        // 64 characters - too long (max is 63)
        string
            memory longLabel = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        assertFalse(l2Registrar.isValidLabel(longLabel));
    }

    function test_isValidLabel_maxLength() external view {
        // 63 characters - exactly at max
        string memory maxLabel = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        assertTrue(l2Registrar.isValidLabel(maxLabel));
    }

    function test_isValidLabel_invalidChars() external view {
        assertFalse(l2Registrar.isValidLabel("ALICE")); // uppercase
        assertFalse(l2Registrar.isValidLabel("alice_bob")); // underscore
        assertFalse(l2Registrar.isValidLabel("alice.bob")); // dot
        assertFalse(l2Registrar.isValidLabel("alice bob")); // space
        assertFalse(l2Registrar.isValidLabel("alice!")); // special char
    }

    function test_isValidLabel_hyphenAtStart() external view {
        assertFalse(l2Registrar.isValidLabel("-alice"));
        assertFalse(l2Registrar.isValidLabel("-ab"));
    }

    function test_isValidLabel_hyphenAtEnd() external view {
        assertFalse(l2Registrar.isValidLabel("alice-"));
        assertFalse(l2Registrar.isValidLabel("ab-"));
    }

    function test_isValidLabel_hyphenInMiddle() external view {
        assertTrue(l2Registrar.isValidLabel("al-ice"));
        assertTrue(l2Registrar.isValidLabel("a-b-c"));
        assertTrue(l2Registrar.isValidLabel("my-cool-name"));
    }

    /*//////////////////////////////////////////////////////////////
                            REGISTRATION
    //////////////////////////////////////////////////////////////*/

    function test_register() external {
        vm.prank(deployer);
        l2Registrar.register("alice", alice);

        // Verify subdomain was created
        bytes32 aliceNode = _subdomainHash("alice");
        assertEq(l2Registry.subdomainOwner(aliceNode), alice, "Alice should own subdomain");
    }

    function test_register_setsAddressRecords() external {
        vm.prank(deployer);
        l2Registrar.register("alice", alice);

        bytes32 aliceNode = _subdomainHash("alice");

        // Check ETH address (coinType 60)
        assertEq(addrResolver.addr(aliceNode), alice, "ETH address should be set");

        // Check chain-specific address
        bytes memory chainAddr = addrResolver.addr(aliceNode, COIN_TYPE_BASE);
        assertEq(address(bytes20(chainAddr)), alice, "Chain address should be set");
    }

    function test_revertWhen_register_notOwner() external {
        vm.prank(alice);
        vm.expectRevert();
        l2Registrar.register("alice", alice);
    }

    function test_revertWhen_register_invalidLabel() external {
        vm.prank(deployer);
        vm.expectRevert(L2RegistrarMod.L2Registrar__InvalidLabel.selector);
        l2Registrar.register("ab", alice); // too short

        vm.prank(deployer);
        vm.expectRevert(L2RegistrarMod.L2Registrar__InvalidLabel.selector);
        l2Registrar.register("-alice", alice); // hyphen at start

        vm.prank(deployer);
        vm.expectRevert(L2RegistrarMod.L2Registrar__InvalidLabel.selector);
        l2Registrar.register("ALICE", alice); // uppercase
    }

    function test_revertWhen_register_alreadyExists() external {
        // Register first time
        vm.prank(deployer);
        l2Registrar.register("alice", alice);

        // Try to register again
        vm.prank(deployer);
        vm.expectRevert();
        l2Registrar.register("alice", bob);
    }

    /*//////////////////////////////////////////////////////////////
                            AVAILABILITY
    //////////////////////////////////////////////////////////////*/

    function test_available_valid() external view {
        assertTrue(l2Registrar.available("alice"));
        assertTrue(l2Registrar.available("bob123"));
        assertTrue(l2Registrar.available("my-name"));
    }

    function test_available_invalidLabel() external view {
        assertFalse(l2Registrar.available("ab")); // too short
        assertFalse(l2Registrar.available("-alice")); // hyphen at start
        assertFalse(l2Registrar.available("ALICE")); // uppercase
    }

    function test_available_alreadyRegistered() external {
        // Register alice
        vm.prank(deployer);
        l2Registrar.register("alice", alice);

        // Should no longer be available
        assertFalse(l2Registrar.available("alice"));
    }

    /*//////////////////////////////////////////////////////////////
                            INTEGRATION
    //////////////////////////////////////////////////////////////*/

    function test_register_createsSubdomainInRegistry() external {
        uint256 supplyBefore = l2Registry.totalSupply();

        vm.prank(deployer);
        l2Registrar.register("alice", alice);

        // Verify NFT was minted
        assertEq(l2Registry.totalSupply(), supplyBefore + 1, "Supply should increase by 1");

        // Verify ownership
        bytes32 aliceNode = _subdomainHash("alice");
        assertEq(l2Registry.ownerOf(uint256(aliceNode)), alice, "Alice should own NFT");
    }

    function test_register_setsForwardAddress() external {
        vm.prank(deployer);
        l2Registrar.register("alice", alice);

        bytes32 aliceNode = _subdomainHash("alice");

        // Verify forward resolution works
        assertEq(addrResolver.addr(aliceNode), alice);
    }

    function test_register_multipleSubdomains() external {
        vm.startPrank(deployer);
        l2Registrar.register("alice", alice);
        l2Registrar.register("bob", bob);
        l2Registrar.register("charlie", address(0x3));
        vm.stopPrank();

        // Verify all subdomains exist
        assertTrue(!l2Registrar.available("alice"));
        assertTrue(!l2Registrar.available("bob"));
        assertTrue(!l2Registrar.available("charlie"));

        // Verify correct owners
        assertEq(l2Registry.subdomainOwner(_subdomainHash("alice")), alice);
        assertEq(l2Registry.subdomainOwner(_subdomainHash("bob")), bob);
        assertEq(l2Registry.subdomainOwner(_subdomainHash("charlie")), address(0x3));
    }
}
