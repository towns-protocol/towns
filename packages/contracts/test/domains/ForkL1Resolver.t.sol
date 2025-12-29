// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IExtendedResolver} from "@ensdomains/ens-contracts/resolvers/profiles/IExtendedResolver.sol";
import {IAddrResolver} from "@ensdomains/ens-contracts/resolvers/profiles/IAddrResolver.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {INameWrapper} from "@ensdomains/ens-contracts/wrapper/INameWrapper.sol";
import {IL1ResolverService} from "src/domains/facets/l1/IL1ResolverService.sol";

// libraries
import {NameCoder} from "@ensdomains/ens-contracts/utils/NameCoder.sol";
import {OffchainLookup} from "@ensdomains/ens-contracts/ccipRead/EIP3668.sol";

// contracts
import {TestUtils} from "@towns-protocol/diamond/test/TestUtils.sol";
import {Diamond, IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DiamondCutFacet} from "@towns-protocol/diamond/src/facets/cut/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "@towns-protocol/diamond/src/facets/loupe/DiamondLoupeFacet.sol";
import {IntrospectionFacet} from "@towns-protocol/diamond/src/facets/introspection/IntrospectionFacet.sol";
import {OwnableFacet} from "@towns-protocol/diamond/src/facets/ownable/OwnableFacet.sol";
import {L1ResolverFacet} from "src/domains/facets/l1/L1ResolverFacet.sol";
import {ENS} from "@ensdomains/ens-contracts/registry/ENS.sol";

// deployments
import {DeployDiamondCut} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.sol";
import {DeployDiamondLoupe} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.sol";
import {DeployIntrospection} from "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.sol";
import {DeployOwnable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployOwnable.sol";
import {DeployL1ResolverFacet} from "scripts/deployments/facets/DeployL1ResolverFacet.s.sol";

/// @title ForkL1ResolverTest
/// @notice Fork tests against mainnet ENS
contract ForkL1ResolverTest is TestUtils {
    // ENS protocol address (mainnet)
    address internal constant ENS_REGISTRY = 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e;

    // Known ENS domains for testing
    string internal constant VITALIK_ENS = "vitalik.eth";

    // Name Wrapper address on mainnet
    address internal constant NAME_WRAPPER = 0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401;

    // Test data
    string internal constant GATEWAY_URL = "https://gateway.test.com/{sender}/{data}";
    uint64 internal constant TEST_CHAIN_ID = 8453; // Base

    address internal deployer;
    address internal l1Resolver;

    uint256 internal signerPrivateKey;
    address internal signer;
    address internal l2Registry;

    function setUp() public virtual {
        deployer = getDeployer();
        signerPrivateKey = _randomUint256();
        signer = vm.addr(signerPrivateKey);
        l2Registry = _randomAddress();

        vm.createSelectFork("mainnet");
        _deployDirect();
    }

    /// @notice Deploy L1Resolver directly (for fork tests where CREATE2 factory doesn't exist)
    function _deployDirect() internal {
        // Deploy facets directly
        DiamondCutFacet diamondCutFacet = new DiamondCutFacet();
        DiamondLoupeFacet diamondLoupeFacet = new DiamondLoupeFacet();
        IntrospectionFacet introspectionFacet = new IntrospectionFacet();
        OwnableFacet ownableFacet = new OwnableFacet();
        L1ResolverFacet l1ResolverFacet = new L1ResolverFacet();
        MultiInit multiInit = new MultiInit();

        // Build facet cuts
        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](5);

        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(diamondCutFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: DeployDiamondCut.selectors()
        });

        cuts[1] = IDiamond.FacetCut({
            facetAddress: address(diamondLoupeFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: DeployDiamondLoupe.selectors()
        });

        cuts[2] = IDiamond.FacetCut({
            facetAddress: address(introspectionFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: DeployIntrospection.selectors()
        });

        cuts[3] = IDiamond.FacetCut({
            facetAddress: address(ownableFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: DeployOwnable.selectors()
        });

        cuts[4] = IDiamond.FacetCut({
            facetAddress: address(l1ResolverFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: DeployL1ResolverFacet.selectors()
        });

        // Build init data
        address[] memory initAddresses = new address[](5);
        bytes[] memory initDatas = new bytes[](5);

        initAddresses[0] = address(diamondCutFacet);
        initDatas[0] = DeployDiamondCut.makeInitData();

        initAddresses[1] = address(diamondLoupeFacet);
        initDatas[1] = DeployDiamondLoupe.makeInitData();

        initAddresses[2] = address(introspectionFacet);
        initDatas[2] = DeployIntrospection.makeInitData();

        initAddresses[3] = address(ownableFacet);
        initDatas[3] = DeployOwnable.makeInitData(deployer);

        initAddresses[4] = address(l1ResolverFacet);
        initDatas[4] = DeployL1ResolverFacet.makeInitData(GATEWAY_URL, signer);

        // Deploy diamond
        Diamond.InitParams memory initParams = Diamond.InitParams({
            baseFacets: cuts,
            init: address(multiInit),
            initData: abi.encodeCall(MultiInit.multiInit, (initAddresses, initDatas))
        });

        l1Resolver = address(new Diamond(initParams));
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

    /*//////////////////////////////////////////////////////////////
                              FORK TESTS
    //////////////////////////////////////////////////////////////*/

    function test_supportsInterface() external view onlyForked {
        // Verify deployment succeeded
        assertTrue(l1Resolver != address(0), "Should deploy resolver");
        assertTrue(
            IERC165(l1Resolver).supportsInterface(type(IExtendedResolver).interfaceId),
            "Should support IExtendedResolver"
        );
    }

    function test_forkSetL2RegistryWithDirectOwner() external onlyForked {
        // Use a domain that is NOT wrapped (direct ENS ownership)
        // We'll use the ENS root node which is owned by the ENS DAO
        bytes32 ethNode = _namehash("eth");
        address ensOwner = ENS(ENS_REGISTRY).owner(ethNode);

        // Skip if owner is zero (shouldn't happen for eth)
        vm.assume(ensOwner != address(0));

        // Set L2 registry as the domain owner
        vm.prank(ensOwner);
        L1ResolverFacet(l1Resolver).setL2Registry(ethNode, TEST_CHAIN_ID, l2Registry);
    }

    function test_forkSetL2RegistryWithWrappedDomain() external onlyForked {
        // vitalik.eth is wrapped - owned by Name Wrapper
        bytes32 vitalikNode = _namehash(VITALIK_ENS);
        address ensOwner = ENS(ENS_REGISTRY).owner(vitalikNode);

        // If the domain is wrapped, the ENS registry owner is the Name Wrapper
        if (ensOwner == NAME_WRAPPER) {
            // Get the actual owner from Name Wrapper
            address wrappedOwner = INameWrapper(NAME_WRAPPER).ownerOf(uint256(vitalikNode));

            vm.assume(wrappedOwner != address(0));

            // Set L2 registry as the wrapped domain owner
            vm.prank(wrappedOwner);
            L1ResolverFacet(l1Resolver).setL2Registry(vitalikNode, TEST_CHAIN_ID, l2Registry);
        } else {
            // Domain is not wrapped, use direct owner
            vm.assume(ensOwner != address(0));
            vm.prank(ensOwner);
            L1ResolverFacet(l1Resolver).setL2Registry(vitalikNode, TEST_CHAIN_ID, l2Registry);
        }
    }

    function test_forkResolveRevertsWithOffchainLookup() external onlyForked {
        // Setup L2 registry for a domain we can control (using eth TLD owner)
        bytes32 ethNode = _namehash("eth");
        address ensOwner = ENS(ENS_REGISTRY).owner(ethNode);
        vm.assume(ensOwner != address(0));

        vm.prank(ensOwner);
        L1ResolverFacet(l1Resolver).setL2Registry(ethNode, TEST_CHAIN_ID, l2Registry);

        // Try to resolve a subdomain - should trigger OffchainLookup
        bytes memory name = _dnsEncode("test.eth");
        bytes memory data = abi.encodeWithSelector(
            IAddrResolver.addr.selector,
            _namehash("test.eth")
        );

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
}
