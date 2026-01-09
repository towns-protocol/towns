// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IL2Registrar} from "src/domains/facets/registrar/IL2Registrar.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IFeeManager} from "src/factory/facets/fee/IFeeManager.sol";

// libraries
import {L2RegistrarMod} from "src/domains/facets/registrar/L2RegistrarMod.sol";
import {FeeTypesLib} from "src/factory/facets/fee/FeeTypesLib.sol";
import {FeeCalculationMethod} from "src/factory/facets/fee/FeeManagerStorage.sol";

// contracts
import {DomainFeeHook} from "src/domains/facets/registrar/DomainFeeHook.sol";

// facets
import {L2RegistryFacet} from "src/domains/facets/l2/L2RegistryFacet.sol";
import {L2RegistrarFacet} from "src/domains/facets/registrar/L2RegistrarFacet.sol";
import {AddrResolverFacet} from "src/domains/facets/l2/AddrResolverFacet.sol";

// mocks
import {MockSmartAccount} from "test/mocks/domains/MockSmartAccount.sol";
import {MockNonSmartAccount} from "test/mocks/domains/MockNonSmartAccount.sol";
import {MockFeeManager} from "test/mocks/domains/MockFeeManager.sol";
import {MockERC20} from "test/mocks/MockERC20.sol";

// test setup
import {L2ResolverBaseSetup} from "./setup/L2ResolverBaseSetup.sol";

// deployments
import {DeployL2Registrar} from "scripts/deployments/diamonds/DeployL2Registrar.s.sol";
import {DeployMockUSDC} from "scripts/deployments/utils/DeployMockUSDC.s.sol";

/// @title L2RegistrarTest
/// @notice Unit tests for L2 Registrar diamond with smart account and fee integration
contract L2RegistrarTest is L2ResolverBaseSetup {
    // Constants
    uint256 internal constant COIN_TYPE_BASE = 0x80000000 | 31337; // anvil chainId

    // Deployments
    DeployL2Registrar internal deployL2Registrar;
    DeployMockUSDC internal deployMockUSDC;
    address internal registrarDiamond;

    // Mock contracts
    MockSmartAccount internal smartAccount;
    MockNonSmartAccount internal nonSmartAccount;
    MockFeeManager internal mockFeeManager;
    MockERC20 internal mockUSDC;

    // Typed facet references
    L2RegistrarFacet internal l2Registrar;
    L2RegistryFacet internal l2Registry;
    AddrResolverFacet internal addrResolver;

    function setUp() public override {
        super.setUp(); // Deploys L2Resolver

        // Deploy mock contracts
        smartAccount = new MockSmartAccount();
        nonSmartAccount = new MockNonSmartAccount();
        mockFeeManager = new MockFeeManager();
        deployMockUSDC = new DeployMockUSDC();
        mockUSDC = MockERC20(deployMockUSDC.deploy(deployer));

        // Deploy L2Registrar diamond pointing to l2Resolver
        deployL2Registrar = new DeployL2Registrar();
        deployL2Registrar.setRegistry(l2Resolver);
        deployL2Registrar.setSpaceFactory(address(spaceFactory));
        deployL2Registrar.setUSDC(address(mockUSDC));
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

    function test_initialization() external {
        // Verify registrar points to correct registry
        assertEq(l2Registrar.getRegistry(), l2Resolver, "Registry should be l2Resolver");

        // Verify spaceFactory is set
        assertEq(
            l2Registrar.getSpaceFactory(),
            address(spaceFactory),
            "SpaceFactory should be spaceFactory"
        );

        // Verify coinType is correctly computed
        assertEq(l2Registrar.getCoinType(), COIN_TYPE_BASE, "CoinType should match");

        // Verify currency is set
        assertEq(l2Registrar.getCurrency(), address(mockUSDC), "Currency should be USDC");

        // Verify interface support
        assertTrue(
            IERC165(registrarDiamond).supportsInterface(type(IL2Registrar).interfaceId),
            "Should support IL2Registrar"
        );
    }

    function test_getRegistry() external {
        assertEq(l2Registrar.getRegistry(), l2Resolver);
    }

    function test_getCoinType() external {
        assertEq(l2Registrar.getCoinType(), COIN_TYPE_BASE);
    }

    function test_getSpaceFactory() external {
        assertEq(l2Registrar.getSpaceFactory(), address(spaceFactory));
    }

    function test_setSpaceFactory() external {
        address newFactory = _randomAddress();

        vm.prank(deployer);
        vm.expectEmit(registrarDiamond);
        emit L2RegistrarMod.SpaceFactorySet(newFactory);
        l2Registrar.setSpaceFactory(newFactory);

        assertEq(l2Registrar.getSpaceFactory(), newFactory);
    }

    function test_revertWhen_setSpaceFactory_notOwner() external {
        vm.prank(alice);
        vm.expectRevert();
        l2Registrar.setSpaceFactory(alice);
    }

    /*//////////////////////////////////////////////////////////////
                          LABEL VALIDATION
    //////////////////////////////////////////////////////////////*/

    function test_isValidLabel_valid() external {
        assertTrue(l2Registrar.isValidLabel("alice"));
        assertTrue(l2Registrar.isValidLabel("bob123"));
        assertTrue(l2Registrar.isValidLabel("my-name"));
        assertTrue(l2Registrar.isValidLabel("a1b"));
        assertTrue(l2Registrar.isValidLabel("abc"));
    }

    function test_isValidLabel_tooShort() external {
        assertFalse(l2Registrar.isValidLabel("ab"));
        assertFalse(l2Registrar.isValidLabel("a"));
        assertFalse(l2Registrar.isValidLabel(""));
    }

    function test_isValidLabel_tooLong() external {
        // 64 characters - too long (max is 63)
        string
            memory longLabel = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        assertFalse(l2Registrar.isValidLabel(longLabel));
    }

    function test_isValidLabel_maxLength() external {
        // 63 characters - exactly at max
        string memory maxLabel = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        assertTrue(l2Registrar.isValidLabel(maxLabel));
    }

    function test_isValidLabel_invalidChars() external {
        assertFalse(l2Registrar.isValidLabel("ALICE")); // uppercase
        assertFalse(l2Registrar.isValidLabel("alice_bob")); // underscore
        assertFalse(l2Registrar.isValidLabel("alice.bob")); // dot
        assertFalse(l2Registrar.isValidLabel("alice bob")); // space
        assertFalse(l2Registrar.isValidLabel("alice!")); // special char
    }

    function test_isValidLabel_hyphenAtStart() external {
        assertFalse(l2Registrar.isValidLabel("-alice"));
        assertFalse(l2Registrar.isValidLabel("-ab"));
    }

    function test_isValidLabel_hyphenAtEnd() external {
        assertFalse(l2Registrar.isValidLabel("alice-"));
        assertFalse(l2Registrar.isValidLabel("ab-"));
    }

    function test_isValidLabel_hyphenInMiddle() external {
        assertTrue(l2Registrar.isValidLabel("al-ice"));
        assertTrue(l2Registrar.isValidLabel("a-b-c"));
        assertTrue(l2Registrar.isValidLabel("my-cool-name"));
    }

    /*//////////////////////////////////////////////////////////////
                        SMART ACCOUNT VALIDATION
    //////////////////////////////////////////////////////////////*/

    function test_register_fromSmartAccount() external {
        vm.prank(address(smartAccount));
        l2Registrar.register("alice", alice);

        // Verify subdomain was created
        bytes32 aliceNode = _subdomainHash("alice");
        assertEq(l2Registry.subdomainOwner(aliceNode), alice, "Alice should own subdomain");
    }

    function test_revertWhen_register_fromEOA() external {
        vm.prank(alice);
        vm.expectRevert(L2RegistrarMod.L2Registrar__NotSmartAccount.selector);
        l2Registrar.register("alice", alice);
    }

    function test_revertWhen_register_fromNonSmartAccountContract() external {
        vm.prank(address(nonSmartAccount));
        vm.expectRevert(L2RegistrarMod.L2Registrar__NotSmartAccount.selector);
        l2Registrar.register("alice", alice);
    }

    /*//////////////////////////////////////////////////////////////
                            FEE INTEGRATION
    //////////////////////////////////////////////////////////////*/
    function test_register_chargeFee() external {
        // 1. Deploy DomainFeeHook with $5 USDC default price (6 decimals)
        uint256 defaultPrice = 5_000_000; // $5 USDC
        DomainFeeHook feeHook = new DomainFeeHook(deployer, address(spaceFactory), defaultPrice);

        // 2. Configure FeeManager on spaceFactory
        vm.startPrank(deployer);

        // Enable DOMAIN_REGISTRATION fee type (using FIXED method, but hook will override)
        IFeeManager(spaceFactory).setFeeConfig(
            FeeTypesLib.DOMAIN_REGISTRATION,
            deployer, // recipient
            FeeCalculationMethod.FIXED, // method (hook overrides anyway)
            0, // bps (not used for FIXED)
            0, // fixedFee (hook overrides)
            true // enabled
        );

        // Set the fee hook
        IFeeManager(spaceFactory).setFeeHook(FeeTypesLib.DOMAIN_REGISTRATION, address(feeHook));
        vm.stopPrank();

        // 3. First registration is free (DomainFeeHook gives first free)
        uint256 fee = IFeeManager(spaceFactory).calculateFee(
            FeeTypesLib.DOMAIN_REGISTRATION,
            address(smartAccount),
            0,
            abi.encode(bytes("alice").length)
        );
        assertEq(fee, 0, "First registration should be free");

        // Register first domain (free)
        vm.prank(address(smartAccount));
        l2Registrar.register("alice", alice);

        // Verify subdomain was created
        bytes32 aliceNode = _subdomainHash("alice");
        assertEq(l2Registry.subdomainOwner(aliceNode), alice, "Alice should own subdomain");

        // Now second registration should cost $5 USDC
        fee = IFeeManager(spaceFactory).calculateFee(
            FeeTypesLib.DOMAIN_REGISTRATION,
            address(smartAccount),
            0,
            abi.encode(bytes("bob").length)
        );
        assertEq(fee, defaultPrice, "Second registration should cost default price");

        // Mint USDC to the registrar diamond (fees are pulled from registrar)
        mockUSDC.mint(registrarDiamond, fee);

        // Record balances before registration
        uint256 recipientBalanceBefore = mockUSDC.balanceOf(deployer);

        // Register second domain (paid)
        vm.prank(address(smartAccount));
        l2Registrar.register("bob", bob);

        // Verify subdomain was created
        bytes32 bobNode = _subdomainHash("bob");
        assertEq(l2Registry.subdomainOwner(bobNode), bob, "Bob should own subdomain");

        // Verify USDC was transferred to recipient
        assertEq(
            mockUSDC.balanceOf(deployer),
            recipientBalanceBefore + defaultPrice,
            "Recipient should receive fee"
        );

        // Verify registrar balance is now 0
        assertEq(
            mockUSDC.balanceOf(registrarDiamond),
            0,
            "Registrar should have no remaining USDC"
        );
    }

    function test_register_chargesMockFee() external {
        vm.prank(deployer);
        l2Registrar.setSpaceFactory(address(mockFeeManager));

        uint256 fee = mockFeeManager.calculateFee(
            FeeTypesLib.DOMAIN_REGISTRATION,
            address(0),
            0,
            ""
        );

        mockUSDC.mint(address(smartAccount), fee);

        vm.prank(address(smartAccount));
        l2Registrar.register("alice", alice);

        // Verify fee manager was called
        assertTrue(mockFeeManager.chargeFeeCalled(), "Fee should be charged");
        assertEq(
            mockFeeManager.lastFeeType(),
            FeeTypesLib.DOMAIN_REGISTRATION,
            "Fee type should match"
        );
        assertEq(mockFeeManager.lastUser(), address(smartAccount), "User should be smart account");

        // Verify extraData contains label length
        uint256 labelLength = abi.decode(mockFeeManager.lastExtraData(), (uint256));
        assertEq(labelLength, 5, "Label length should be 5 for 'alice'");
    }

    function test_register_noFeeManagerSet() external {
        // Set spaceFactory to zero address
        vm.prank(deployer);
        l2Registrar.setSpaceFactory(address(0));

        // Registration should still work (free)
        vm.prank(address(smartAccount));
        l2Registrar.register("alice", alice);

        // Verify subdomain was created
        bytes32 aliceNode = _subdomainHash("alice");
        assertEq(l2Registry.subdomainOwner(aliceNode), alice, "Alice should own subdomain");
    }

    /*//////////////////////////////////////////////////////////////
                            REGISTRATION
    //////////////////////////////////////////////////////////////*/

    function test_register_setsAddressRecords() external {
        vm.prank(address(smartAccount));
        l2Registrar.register("alice", alice);

        bytes32 aliceNode = _subdomainHash("alice");

        // Check ETH address (coinType 60)
        assertEq(addrResolver.addr(aliceNode), alice, "ETH address should be set");

        // Check chain-specific address
        bytes memory chainAddr = addrResolver.addr(aliceNode, COIN_TYPE_BASE);
        assertEq(address(bytes20(chainAddr)), alice, "Chain address should be set");
    }

    function test_revertWhen_register_invalidLabel() external {
        vm.prank(address(smartAccount));
        vm.expectRevert(L2RegistrarMod.L2Registrar__InvalidLabel.selector);
        l2Registrar.register("ab", alice); // too short

        vm.prank(address(smartAccount));
        vm.expectRevert(L2RegistrarMod.L2Registrar__InvalidLabel.selector);
        l2Registrar.register("-alice", alice); // hyphen at start

        vm.prank(address(smartAccount));
        vm.expectRevert(L2RegistrarMod.L2Registrar__InvalidLabel.selector);
        l2Registrar.register("ALICE", alice); // uppercase
    }

    function test_revertWhen_register_alreadyExists() external {
        // Register first time
        vm.prank(address(smartAccount));
        l2Registrar.register("alice", alice);

        // Try to register again
        vm.prank(address(smartAccount));
        vm.expectRevert();
        l2Registrar.register("alice", bob);
    }

    /*//////////////////////////////////////////////////////////////
                            AVAILABILITY
    //////////////////////////////////////////////////////////////*/

    function test_available_valid() external {
        assertTrue(l2Registrar.available("alice"));
        assertTrue(l2Registrar.available("bob123"));
        assertTrue(l2Registrar.available("my-name"));
    }

    function test_available_invalidLabel() external {
        assertFalse(l2Registrar.available("ab")); // too short
        assertFalse(l2Registrar.available("-alice")); // hyphen at start
        assertFalse(l2Registrar.available("ALICE")); // uppercase
    }

    function test_available_alreadyRegistered() external {
        // Register alice
        vm.prank(address(smartAccount));
        l2Registrar.register("alice", alice);

        // Should no longer be available
        assertFalse(l2Registrar.available("alice"));
    }

    /*//////////////////////////////////////////////////////////////
                            INTEGRATION
    //////////////////////////////////////////////////////////////*/

    function test_register_createsSubdomainInRegistry() external {
        uint256 supplyBefore = l2Registry.totalSupply();

        vm.prank(address(smartAccount));
        l2Registrar.register("alice", alice);

        // Verify NFT was minted
        assertEq(l2Registry.totalSupply(), supplyBefore + 1, "Supply should increase by 1");

        // Verify ownership
        bytes32 aliceNode = _subdomainHash("alice");
        assertEq(l2Registry.ownerOf(uint256(aliceNode)), alice, "Alice should own NFT");
    }

    function test_register_setsForwardAddress() external {
        vm.prank(address(smartAccount));
        l2Registrar.register("alice", alice);

        bytes32 aliceNode = _subdomainHash("alice");

        // Verify forward resolution works
        assertEq(addrResolver.addr(aliceNode), alice);
    }

    function test_register_multipleSubdomains() external {
        MockSmartAccount smartAccount2 = new MockSmartAccount();
        MockSmartAccount smartAccount3 = new MockSmartAccount();

        vm.prank(address(smartAccount));
        l2Registrar.register("alice", alice);

        vm.prank(address(smartAccount2));
        l2Registrar.register("bob", bob);

        vm.prank(address(smartAccount3));
        l2Registrar.register("charlie", address(0x3));

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
