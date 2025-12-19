// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IExtendedResolver} from "@ensdomains/ens-contracts/resolvers/profiles/IExtendedResolver.sol";
import {IAddrResolver} from "@ensdomains/ens-contracts/resolvers/profiles/IAddrResolver.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IL1ResolverService} from "src/domains/facets/resolver/IL1ResolverService.sol";
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";

// libraries
import {OffchainLookup} from "@ensdomains/ens-contracts/ccipRead/EIP3668.sol";

// contracts
import {L1ResolverFacet} from "src/domains/facets/resolver/L1ResolverFacet.sol";
import {L1ResolverMod} from "src/domains/facets/resolver/L1ResolverMod.sol";

// test setup
import {L1ResolverBaseSetup} from "./L1ResolverBaseSetup.sol";

/// @title L1ResolverUnitTest
/// @notice Unit tests using mocked ENS contracts
contract L1ResolverUnitTest is L1ResolverBaseSetup {
    function setUp() public override {
        super.setUp();
        _deployWithMocks();
    }

    /*//////////////////////////////////////////////////////////////
                            INITIALIZATION
    //////////////////////////////////////////////////////////////*/

    function test_initialization() external view {
        // Verify resolver supports IExtendedResolver interface
        assertTrue(
            IERC165(l1Resolver).supportsInterface(type(IExtendedResolver).interfaceId),
            "Should support IExtendedResolver"
        );
    }

    /*//////////////////////////////////////////////////////////////
                          GATEWAY CONFIGURATION
    //////////////////////////////////////////////////////////////*/

    function test_setGatewayURL(string memory newUrl) external {
        vm.assume(bytes(newUrl).length > 0);

        vm.prank(deployer);
        L1ResolverFacet(l1Resolver).setGatewayURL(newUrl);

        // Verify the gateway URL was stored
        string memory storedUrl = L1ResolverFacet(l1Resolver).getGatewayURL();
        assertEq(storedUrl, newUrl, "Gateway URL should match");
    }

    function test_revertWhen_setGatewayURLNotOwner(address notOwner) external {
        vm.assume(notOwner != deployer);
        vm.prank(notOwner);
        vm.expectRevert(abi.encodeWithSelector(IOwnableBase.Ownable__NotOwner.selector, notOwner));
        L1ResolverFacet(l1Resolver).setGatewayURL("https://test.com");
    }

    function test_revertWhen_setGatewayURLEmpty() external {
        vm.prank(deployer);
        vm.expectRevert(L1ResolverMod.L1Resolver__InvalidGatewayURL.selector);
        L1ResolverFacet(l1Resolver).setGatewayURL("");
    }

    function test_setGatewaySigner(address newSigner) external {
        vm.assume(newSigner != deployer);
        vm.assume(newSigner != address(0));

        vm.prank(deployer);
        L1ResolverFacet(l1Resolver).setGatewaySigner(newSigner);

        // Verify the signer was stored
        address storedSigner = L1ResolverFacet(l1Resolver).getGatewaySigner();
        assertEq(storedSigner, newSigner, "Gateway signer should match");
    }

    function test_revertWhen_setGatewaySignerNotOwner(address notOwner) external {
        vm.assume(notOwner != deployer);
        vm.assume(notOwner != address(0));

        vm.prank(notOwner);
        vm.expectRevert(abi.encodeWithSelector(IOwnableBase.Ownable__NotOwner.selector, notOwner));
        L1ResolverFacet(l1Resolver).setGatewaySigner(_randomAddress());
    }

    function test_revertWhen_setGatewaySignerZeroAddress() external {
        vm.prank(deployer);
        vm.expectRevert(L1ResolverMod.L1Resolver__InvalidGatewaySigner.selector);
        L1ResolverFacet(l1Resolver).setGatewaySigner(address(0));
    }

    /*//////////////////////////////////////////////////////////////
                          L2 REGISTRY MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    function test_setL2Registry(bytes32 node) external {
        vm.assume(node != bytes32(0));

        // Setup domain ownership
        _setDomainOwner(node, domainOwner);

        vm.prank(domainOwner);
        L1ResolverFacet(l1Resolver).setL2Registry(node, TEST_CHAIN_ID, l2Registry);

        // Verify the registry mapping was updated
        (uint64 storedChainId, address storedRegistry) = L1ResolverFacet(l1Resolver).getL2Registry(
            node
        );
        assertEq(storedChainId, TEST_CHAIN_ID, "Chain ID should match");
        assertEq(storedRegistry, l2Registry, "Registry address should match");
    }

    function test_revertWhen_setL2RegistryNotOwner(bytes32 node) external {
        vm.assume(node != bytes32(0));
        vm.assume(node != testNode);

        // Setup domain ownership to someone else
        _setDomainOwner(node, domainOwner);

        address notOwner = _randomAddress();
        vm.assume(notOwner != domainOwner);
        vm.prank(notOwner);
        vm.expectRevert(L1ResolverMod.L1Resolver__InvalidOwner.selector);
        L1ResolverFacet(l1Resolver).setL2Registry(node, TEST_CHAIN_ID, l2Registry);
    }

    /*//////////////////////////////////////////////////////////////
                              RESOLVE
    //////////////////////////////////////////////////////////////*/

    function test_resolve_revertsWithOffchainLookup() external {
        // Setup L2 registry for test.eth
        _setDomainOwner(testNode, domainOwner);
        vm.prank(domainOwner);
        L1ResolverFacet(l1Resolver).setL2Registry(testNode, TEST_CHAIN_ID, l2Registry);

        // Encode name and resolution data
        bytes memory name = _dnsEncode("sub.test.eth");
        bytes memory data = abi.encodeWithSelector(IAddrResolver.addr.selector, testNode);

        // Build expected OffchainLookup parameters
        string[] memory urls = new string[](1);
        urls[0] = GATEWAY_URL;

        bytes memory callData = abi.encodeCall(
            IL1ResolverService.stuffedResolveCall,
            (name, data, TEST_CHAIN_ID, l2Registry)
        );

        // Should revert with specific OffchainLookup error
        vm.expectRevert(
            abi.encodeWithSelector(
                OffchainLookup.selector,
                l1Resolver,
                urls,
                callData,
                L1ResolverFacet.resolveWithProof.selector,
                callData // extraData same as callData
            )
        );
        L1ResolverFacet(l1Resolver).resolve(name, data);
    }

    function test_revertWhen_resolveNoL2Registry() external {
        bytes memory name = _dnsEncode("sub.test.eth");
        bytes memory data = abi.encodeWithSelector(IAddrResolver.addr.selector, testNode);

        vm.expectRevert(L1ResolverMod.L1Resolver__InvalidL2Registry.selector);
        L1ResolverFacet(l1Resolver).resolve(name, data);
    }

    function test_revertWhen_resolveInvalidName() external {
        // Single label name (no TLD)
        bytes memory name = _dnsEncode("test");
        bytes memory data = abi.encodeWithSelector(IAddrResolver.addr.selector, testNode);

        vm.expectRevert(L1ResolverMod.L1Resolver__InvalidName.selector);
        L1ResolverFacet(l1Resolver).resolve(name, data);
    }

    /*//////////////////////////////////////////////////////////////
                          RESOLVE WITH PROOF
    //////////////////////////////////////////////////////////////*/

    function test_resolveWithProof() external {
        // Setup L2 registry
        _setDomainOwner(testNode, domainOwner);
        vm.prank(domainOwner);
        L1ResolverFacet(l1Resolver).setL2Registry(testNode, TEST_CHAIN_ID, l2Registry);

        // Prepare test data
        bytes memory name = _dnsEncode("sub.test.eth");
        bytes memory resolveData = abi.encodeWithSelector(IAddrResolver.addr.selector, testNode);
        bytes memory extraData = abi.encodeWithSelector(
            IL1ResolverService.stuffedResolveCall.selector,
            name,
            resolveData,
            TEST_CHAIN_ID,
            l2Registry
        );

        // Create result and signature
        address resolvedAddress = _randomAddress();
        bytes memory result = abi.encode(resolvedAddress);
        uint64 expires = uint64(block.timestamp + 1 hours);
        bytes memory sig = _signResponse(l1Resolver, expires, extraData, result);

        // Encode response
        bytes memory response = abi.encode(result, expires, sig);

        // Call resolveWithProof
        bytes memory returnedResult = L1ResolverFacet(l1Resolver).resolveWithProof(
            response,
            extraData
        );

        assertEq(returnedResult, result, "Should return correct result");
    }

    function test_revertWhen_resolveWithProofExpired() external {
        bytes memory extraData = abi.encode("test");
        bytes memory result = abi.encode(_randomAddress());
        uint64 expires = uint64(block.timestamp - 1); // Already expired
        bytes memory sig = _signResponse(l1Resolver, expires, extraData, result);

        bytes memory response = abi.encode(result, expires, sig);

        vm.expectRevert(L1ResolverMod.L1Resolver__SignatureExpired.selector);
        L1ResolverFacet(l1Resolver).resolveWithProof(response, extraData);
    }

    function test_revertWhen_resolveWithProofInvalidSignature() external {
        bytes memory extraData = abi.encode("test");
        bytes memory result = abi.encode(_randomAddress());
        uint64 expires = uint64(block.timestamp + 1 hours);

        // Sign with wrong key
        uint256 wrongKey = _randomUint256();
        bytes32 hash = keccak256(
            abi.encodePacked(
                hex"1900",
                l1Resolver,
                expires,
                keccak256(extraData),
                keccak256(result)
            )
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongKey, hash);
        bytes memory wrongSig = abi.encodePacked(r, s, v);

        bytes memory response = abi.encode(result, expires, wrongSig);

        vm.expectRevert(L1ResolverMod.L1Resolver__InvalidSignature.selector);
        L1ResolverFacet(l1Resolver).resolveWithProof(response, extraData);
    }
}
