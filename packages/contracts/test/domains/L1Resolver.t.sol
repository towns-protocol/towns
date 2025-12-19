// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IExtendedResolver} from "@ensdomains/ens-contracts/resolvers/profiles/IExtendedResolver.sol";
import {IAddrResolver} from "@ensdomains/ens-contracts/resolvers/profiles/IAddrResolver.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IL1ResolverService} from "src/domains/facets/resolver/IL1Resolver.sol";

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

    function test_setGatewayURL() external {
        string memory newUrl = "https://new-gateway.com/{sender}/{data}";

        vm.prank(deployer);
        L1ResolverFacet(l1Resolver).setGatewayURL(newUrl);
    }

    function test_revertWhen_setGatewayURLNotOwner() external {
        vm.prank(_randomAddress());
        vm.expectRevert();
        L1ResolverFacet(l1Resolver).setGatewayURL("https://test.com");
    }

    function test_revertWhen_setGatewayURLEmpty() external {
        vm.prank(deployer);
        vm.expectRevert(L1ResolverMod.L1Resolver__InvalidGatewayURL.selector);
        L1ResolverFacet(l1Resolver).setGatewayURL("");
    }

    function test_setGatewaySigner() external {
        address newSigner = _randomAddress();

        vm.prank(deployer);
        L1ResolverFacet(l1Resolver).setGatewaySigner(newSigner);
    }

    function test_revertWhen_setGatewaySignerNotOwner() external {
        vm.prank(_randomAddress());
        vm.expectRevert();
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

    function test_setL2Registry() external {
        // Setup domain ownership
        _setDomainOwner(testNode, domainOwner);

        vm.prank(domainOwner);
        L1ResolverFacet(l1Resolver).setL2Registry(testNode, TEST_CHAIN_ID, l2Registry);
    }

    function test_revertWhen_setL2RegistryNotOwner() external {
        // Setup domain ownership to someone else
        _setDomainOwner(testNode, domainOwner);

        address notOwner = _randomAddress();
        vm.prank(notOwner);
        vm.expectRevert(L1ResolverMod.L1Resolver__InvalidOwner.selector);
        L1ResolverFacet(l1Resolver).setL2Registry(testNode, TEST_CHAIN_ID, l2Registry);
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

        // Should revert with OffchainLookup
        vm.expectRevert();
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
