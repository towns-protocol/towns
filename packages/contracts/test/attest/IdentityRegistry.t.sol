// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISimpleAppBase} from "../../src/apps/simple/app/ISimpleApp.sol";
import {IIdentityRegistryBase} from "../../src/apps/facets/identity/IIdentityRegistry.sol";
import {IAppRegistryBase} from "../../src/apps/facets/registry/IAppRegistry.sol";
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721ABase} from "../../src/diamond/facets/token/ERC721A/IERC721A.sol";

// libraries
import {EMPTY_UID} from "@ethereum-attestation-service/eas-contracts/Common.sol";

// contracts
import {AppRegistryBaseTest} from "./AppRegistryBase.t.sol";
import {AppRegistryFacet} from "../../src/apps/facets/registry/AppRegistryFacet.sol";

contract IdentityRegistryTest is AppRegistryBaseTest, ISimpleAppBase {
    uint256 internal agentId;
    string internal initialUri = "ipfs://QmInitial";

    modifier givenAgentIsRegistered() {
        vm.prank(address(SIMPLE_APP));
        agentId = identityRegistry.register(initialUri);
        _;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   PROMOTE AGENT TESTS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_promoteAgent(
        string calldata uri,
        MetadataEntry[] memory metadata
    ) external givenSimpleAppIsRegistered {
        vm.prank(DEFAULT_DEV);
        uint256 id = simpleApp.promoteAgent(uri, metadata);

        assertEq(id, 1, "Agent ID should be 1");
        assertEq(identityRegistry.tokenURI(id), uri, "Token URI should match provided URI");
    }

    function test_promoteAgent_emitsEvent(
        string calldata uri,
        MetadataEntry[] memory metadata
    ) external givenSimpleAppIsRegistered {
        vm.expectEmit(address(simpleApp));
        emit AgentPromoted(DEFAULT_DEV, 1);

        vm.prank(DEFAULT_DEV);
        simpleApp.promoteAgent(uri, metadata);
    }

    function test_promoteAgent_storesAgentId(
        string calldata uri,
        MetadataEntry[] memory metadata
    ) external givenSimpleAppIsRegistered {
        vm.prank(DEFAULT_DEV);
        uint256 id = simpleApp.promoteAgent(uri, metadata);

        uint256 storedAgentId = simpleApp.getAgentId();
        assertEq(storedAgentId, id, "Stored agent ID should match returned agent ID");
        assertEq(storedAgentId, 1, "Stored agent ID should be 1");
    }

    function test_promoteAgent_withEmptyMetadata(
        string calldata uri
    ) external givenSimpleAppIsRegistered {
        MetadataEntry[] memory emptyMetadata = new MetadataEntry[](0);

        vm.prank(DEFAULT_DEV);
        uint256 id = simpleApp.promoteAgent(uri, emptyMetadata);

        assertEq(id, 1, "Agent ID should be 1");
        assertEq(identityRegistry.tokenURI(id), uri, "Token URI should match provided URI");
    }

    function test_promoteAgent_withMultipleMetadataEntries(
        string calldata uri
    ) external givenSimpleAppIsRegistered {
        MetadataEntry[] memory metadata = new MetadataEntry[](3);
        metadata[0] = MetadataEntry({metadataKey: "name", metadataValue: bytes("Test Agent")});
        metadata[1] = MetadataEntry({
            metadataKey: "description",
            metadataValue: bytes("A test agent for testing")
        });
        metadata[2] = MetadataEntry({metadataKey: "version", metadataValue: bytes("1.0.0")});

        vm.prank(DEFAULT_DEV);
        uint256 id = simpleApp.promoteAgent(uri, metadata);

        assertEq(id, 1, "Agent ID should be 1");
        assertEq(identityRegistry.tokenURI(id), uri, "Token URI should match provided URI");
        assertEq(identityRegistry.getMetadata(id, "name"), bytes("Test Agent"));
        assertEq(
            identityRegistry.getMetadata(id, "description"),
            bytes("A test agent for testing")
        );
        assertEq(identityRegistry.getMetadata(id, "version"), bytes("1.0.0"));
    }

    function test_promoteAgent_onlyOncePerApp() external givenSimpleAppIsRegistered {
        string memory uri = "ipfs://QmTest";
        MetadataEntry[] memory metadata = new MetadataEntry[](0);

        vm.startPrank(DEFAULT_DEV);
        uint256 id = simpleApp.promoteAgent(uri, metadata);
        assertEq(id, 1, "First agent ID should be 1");
        assertEq(simpleApp.getAgentId(), id, "Stored agent ID should match");
        vm.stopPrank();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   REGISTER NO PARAMS TESTS                 */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_register_noParams() external givenSimpleAppIsRegistered {
        vm.prank(address(SIMPLE_APP));
        uint256 id = identityRegistry.register();

        assertEq(id, 1, "Agent ID should be 1");
    }

    function test_register_noParams_mintsNFT() external givenSimpleAppIsRegistered {
        vm.prank(address(SIMPLE_APP));
        uint256 id = identityRegistry.register();

        assertEq(
            IERC721(appRegistry).ownerOf(id),
            address(SIMPLE_APP),
            "NFT should be minted to caller"
        );
        assertEq(IERC721(appRegistry).balanceOf(address(SIMPLE_APP)), 1, "Balance should be 1");
    }

    function test_register_noParams_emitsRegisteredEvent() external givenSimpleAppIsRegistered {
        vm.expectEmit(true, false, false, true, appRegistry);
        emit Registered(1, "", address(SIMPLE_APP));

        vm.prank(address(SIMPLE_APP));
        identityRegistry.register();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   REGISTER WITH URI TESTS                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_register_withUri(string calldata uri) external givenSimpleAppIsRegistered {
        vm.prank(address(SIMPLE_APP));
        uint256 id = identityRegistry.register(uri);

        assertEq(id, 1, "Agent ID should be 1");
        assertEq(identityRegistry.tokenURI(id), uri, "Token URI should match provided URI");
    }

    function test_register_withUri_mintsNFT() external givenSimpleAppIsRegistered {
        string memory uri = "ipfs://QmTest";

        vm.prank(address(SIMPLE_APP));
        uint256 id = identityRegistry.register(uri);

        assertEq(
            IERC721(appRegistry).ownerOf(id),
            address(SIMPLE_APP),
            "NFT should be minted to caller"
        );
        assertEq(IERC721(appRegistry).balanceOf(address(SIMPLE_APP)), 1, "Balance should be 1");
    }

    function test_register_withUri_emitsRegisteredEvent(
        string calldata uri
    ) external givenSimpleAppIsRegistered {
        vm.expectEmit(true, false, false, true, appRegistry);
        emit Registered(1, uri, address(SIMPLE_APP));

        vm.prank(address(SIMPLE_APP));
        identityRegistry.register(uri);
    }

    function test_register_withUri_storesUri(
        string calldata uri
    ) external givenSimpleAppIsRegistered {
        vm.prank(address(SIMPLE_APP));
        uint256 id = identityRegistry.register(uri);

        string memory storedUri = identityRegistry.tokenURI(id);
        assertEq(storedUri, uri, "Stored URI should match provided URI");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*              REGISTER WITH URI AND METADATA TESTS          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_register_withUriAndMetadata(
        string calldata uri
    ) external givenSimpleAppIsRegistered {
        MetadataEntry[] memory metadata = new MetadataEntry[](2);
        metadata[0] = MetadataEntry({metadataKey: "name", metadataValue: bytes("Test Agent")});
        metadata[1] = MetadataEntry({metadataKey: "version", metadataValue: bytes("1.0.0")});

        vm.prank(address(SIMPLE_APP));
        uint256 id = identityRegistry.register(uri, metadata);

        assertEq(id, 1, "Agent ID should be 1");
        assertEq(identityRegistry.tokenURI(id), uri, "Token URI should match provided URI");
        assertEq(
            identityRegistry.getMetadata(id, "name"),
            bytes("Test Agent"),
            "Name metadata should be stored"
        );
        assertEq(
            identityRegistry.getMetadata(id, "version"),
            bytes("1.0.0"),
            "Version metadata should be stored"
        );
    }

    function test_register_withUriAndMetadata_emitsRegisteredEvent(
        string calldata uri
    ) external givenSimpleAppIsRegistered {
        MetadataEntry[] memory metadata = new MetadataEntry[](1);
        metadata[0] = MetadataEntry({metadataKey: "name", metadataValue: bytes("Test")});

        vm.expectEmit(true, false, false, true, appRegistry);
        emit Registered(1, uri, address(SIMPLE_APP));

        vm.prank(address(SIMPLE_APP));
        identityRegistry.register(uri, metadata);
    }

    function test_register_withUriAndMetadata_emitsMetadataSetEvents(
        string calldata uri
    ) external givenSimpleAppIsRegistered {
        MetadataEntry[] memory metadata = new MetadataEntry[](2);
        metadata[0] = MetadataEntry({metadataKey: "name", metadataValue: bytes("Test Agent")});
        metadata[1] = MetadataEntry({metadataKey: "version", metadataValue: bytes("1.0.0")});

        vm.expectEmit(true, true, false, true, appRegistry);
        emit MetadataSet(1, "name", "name", bytes("Test Agent"));

        vm.expectEmit(true, true, false, true, appRegistry);
        emit MetadataSet(1, "version", "version", bytes("1.0.0"));

        vm.prank(address(SIMPLE_APP));
        identityRegistry.register(uri, metadata);
    }

    function test_register_withUriAndMetadata_emptyMetadata(
        string calldata uri
    ) external givenSimpleAppIsRegistered {
        MetadataEntry[] memory emptyMetadata = new MetadataEntry[](0);

        vm.prank(address(SIMPLE_APP));
        uint256 id = identityRegistry.register(uri, emptyMetadata);

        assertEq(id, 1, "Agent ID should be 1");
        assertEq(identityRegistry.tokenURI(id), uri, "Token URI should match provided URI");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   TOKEN ID SEQUENCING TESTS                */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_register_incrementsTokenId() external givenSimpleAppIsRegistered {
        // Create a second app for multiple registrations
        address secondApp = _createTestApp(new bytes32[](1));

        vm.prank(address(SIMPLE_APP));
        uint256 agentId1 = identityRegistry.register();

        vm.prank(secondApp);
        uint256 agentId2 = identityRegistry.register();

        assertEq(agentId1, 1, "First agent ID should be 1");
        assertEq(agentId2, 2, "Second agent ID should be 2");
        assertEq(
            IERC721(appRegistry).ownerOf(1),
            address(SIMPLE_APP),
            "First NFT owned by first app"
        );
        assertEq(IERC721(appRegistry).ownerOf(2), secondApp, "Second NFT owned by second app");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   SET METADATA TESTS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_setMetadata() external givenSimpleAppIsRegistered givenAgentIsRegistered {
        vm.prank(address(SIMPLE_APP));
        identityRegistry.setMetadata(agentId, "name", bytes("Test Agent"));

        bytes memory storedMetadata = identityRegistry.getMetadata(agentId, "name");
        assertEq(storedMetadata, bytes("Test Agent"), "Metadata should be stored correctly");
    }

    function test_setMetadata_emitsMetadataSetEvent()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        vm.expectEmit(true, true, false, true, appRegistry);
        emit MetadataSet(agentId, "name", "name", bytes("Test Agent"));

        vm.prank(address(SIMPLE_APP));
        identityRegistry.setMetadata(agentId, "name", bytes("Test Agent"));
    }

    function test_setMetadata_multipleKeys()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        vm.startPrank(address(SIMPLE_APP));
        identityRegistry.setMetadata(agentId, "name", bytes("Test Agent"));
        identityRegistry.setMetadata(agentId, "version", bytes("1.0.0"));
        identityRegistry.setMetadata(agentId, "description", bytes("A test agent"));
        vm.stopPrank();

        assertEq(identityRegistry.getMetadata(agentId, "name"), bytes("Test Agent"));
        assertEq(identityRegistry.getMetadata(agentId, "version"), bytes("1.0.0"));
        assertEq(identityRegistry.getMetadata(agentId, "description"), bytes("A test agent"));
    }

    function test_setMetadata_overwriteExisting()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        vm.startPrank(address(SIMPLE_APP));
        identityRegistry.setMetadata(agentId, "name", bytes("First Name"));
        assertEq(identityRegistry.getMetadata(agentId, "name"), bytes("First Name"));

        identityRegistry.setMetadata(agentId, "name", bytes("Second Name"));
        assertEq(identityRegistry.getMetadata(agentId, "name"), bytes("Second Name"));
        vm.stopPrank();
    }

    function test_setMetadata_fuzzValues(
        bytes calldata value
    ) external givenSimpleAppIsRegistered givenAgentIsRegistered {
        vm.prank(address(SIMPLE_APP));
        identityRegistry.setMetadata(agentId, "data", value);

        assertEq(identityRegistry.getMetadata(agentId, "data"), value);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   GET METADATA TESTS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_getMetadata() external givenSimpleAppIsRegistered givenAgentIsRegistered {
        vm.prank(address(SIMPLE_APP));
        identityRegistry.setMetadata(agentId, "name", bytes("Test Agent"));

        bytes memory retrieved = identityRegistry.getMetadata(agentId, "name");
        assertEq(retrieved, bytes("Test Agent"));
    }

    function test_getMetadata_nonExistentKey()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        bytes memory retrieved = identityRegistry.getMetadata(agentId, "nonexistent");
        assertEq(retrieved.length, 0, "Should return empty bytes for non-existent key");
    }

    function test_getMetadata_afterMultipleSets()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        vm.startPrank(address(SIMPLE_APP));
        identityRegistry.setMetadata(agentId, "key1", bytes("value1"));
        identityRegistry.setMetadata(agentId, "key2", bytes("value2"));
        identityRegistry.setMetadata(agentId, "key3", bytes("value3"));
        vm.stopPrank();

        assertEq(identityRegistry.getMetadata(agentId, "key1"), bytes("value1"));
        assertEq(identityRegistry.getMetadata(agentId, "key2"), bytes("value2"));
        assertEq(identityRegistry.getMetadata(agentId, "key3"), bytes("value3"));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                METADATA AUTHORIZATION TESTS                */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_setMetadata_byApprovedOperator()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        address operator = _randomAddress();

        // Owner approves operator
        vm.prank(address(SIMPLE_APP));
        IERC721(appRegistry).setApprovalForAll(operator, true);

        // Operator sets metadata
        vm.prank(operator);
        identityRegistry.setMetadata(agentId, "name", bytes("Set by operator"));

        assertEq(identityRegistry.getMetadata(agentId, "name"), bytes("Set by operator"));
    }

    function test_setMetadata_byTokenApproved()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        address approved = _randomAddress();

        // Owner approves specific address for token
        vm.prank(address(SIMPLE_APP));
        IERC721(appRegistry).approve(approved, agentId);

        // Approved address sets metadata
        vm.prank(approved);
        identityRegistry.setMetadata(agentId, "name", bytes("Set by approved"));

        assertEq(identityRegistry.getMetadata(agentId, "name"), bytes("Set by approved"));
    }

    function test_setMetadata_byOwner() external givenSimpleAppIsRegistered givenAgentIsRegistered {
        vm.prank(address(SIMPLE_APP));
        identityRegistry.setMetadata(agentId, "name", bytes("Set by owner"));

        assertEq(identityRegistry.getMetadata(agentId, "name"), bytes("Set by owner"));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                METADATA EDGE CASE TESTS                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_setMetadata_emptyValue()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        vm.prank(address(SIMPLE_APP));
        identityRegistry.setMetadata(agentId, "empty", bytes(""));

        assertEq(identityRegistry.getMetadata(agentId, "empty"), bytes(""));
    }

    function test_setMetadata_largeValue()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        bytes memory largeValue = new bytes(1024);
        for (uint256 i; i < 1024; ++i) {
            largeValue[i] = bytes1(uint8(i % 256));
        }

        vm.prank(address(SIMPLE_APP));
        identityRegistry.setMetadata(agentId, "large", largeValue);

        assertEq(identityRegistry.getMetadata(agentId, "large"), largeValue);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   SET AGENT URI TESTS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_setAgentUri() external givenSimpleAppIsRegistered givenAgentIsRegistered {
        string memory newUri = "ipfs://QmUpdated";

        vm.prank(address(SIMPLE_APP));
        identityRegistry.setAgentUri(agentId, newUri);

        assertEq(identityRegistry.tokenURI(agentId), newUri, "URI should be updated");
    }

    function test_setAgentUri_fuzz(
        string calldata newUri
    ) external givenSimpleAppIsRegistered givenAgentIsRegistered {
        vm.prank(address(SIMPLE_APP));
        identityRegistry.setAgentUri(agentId, newUri);

        assertEq(identityRegistry.tokenURI(agentId), newUri, "URI should be updated");
    }

    function test_setAgentUri_emitsUriUpdatedEvent()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        string memory newUri = "ipfs://QmUpdated";

        vm.expectEmit(true, false, false, true, appRegistry);
        emit UriUpdated(agentId, newUri, address(SIMPLE_APP));

        vm.prank(address(SIMPLE_APP));
        identityRegistry.setAgentUri(agentId, newUri);
    }

    function test_setAgentUri_multipleUpdates()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        string memory uri1 = "ipfs://QmFirst";
        string memory uri2 = "ipfs://QmSecond";
        string memory uri3 = "ipfs://QmThird";

        vm.startPrank(address(SIMPLE_APP));

        identityRegistry.setAgentUri(agentId, uri1);
        assertEq(identityRegistry.tokenURI(agentId), uri1);

        identityRegistry.setAgentUri(agentId, uri2);
        assertEq(identityRegistry.tokenURI(agentId), uri2);

        identityRegistry.setAgentUri(agentId, uri3);
        assertEq(identityRegistry.tokenURI(agentId), uri3);

        vm.stopPrank();
    }

    function test_setAgentUri_emptyString()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        vm.prank(address(SIMPLE_APP));
        identityRegistry.setAgentUri(agentId, "");

        assertEq(identityRegistry.tokenURI(agentId), "", "URI should be empty");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   TOKEN URI TESTS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_tokenURI() external givenSimpleAppIsRegistered givenAgentIsRegistered {
        string memory uri = identityRegistry.tokenURI(agentId);
        assertEq(uri, initialUri, "Should return initial URI");
    }

    function test_tokenURI_afterUpdate()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        string memory newUri = "ipfs://QmUpdated";

        vm.prank(address(SIMPLE_APP));
        identityRegistry.setAgentUri(agentId, newUri);

        assertEq(identityRegistry.tokenURI(agentId), newUri, "Should return updated URI");
    }

    function test_tokenURI_multipleTokens() external givenSimpleAppIsRegistered {
        address secondApp = _createTestApp(new bytes32[](1));

        vm.prank(address(SIMPLE_APP));
        uint256 agentId1 = identityRegistry.register("ipfs://QmAgent1");

        vm.prank(secondApp);
        uint256 agentId2 = identityRegistry.register("ipfs://QmAgent2");

        assertEq(identityRegistry.tokenURI(agentId1), "ipfs://QmAgent1");
        assertEq(identityRegistry.tokenURI(agentId2), "ipfs://QmAgent2");
    }

    function test_tokenURI_afterMultipleUpdates()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        vm.startPrank(address(SIMPLE_APP));
        identityRegistry.setAgentUri(agentId, "ipfs://QmFirst");
        identityRegistry.setAgentUri(agentId, "ipfs://QmSecond");
        identityRegistry.setAgentUri(agentId, "ipfs://QmFinal");
        vm.stopPrank();

        assertEq(identityRegistry.tokenURI(agentId), "ipfs://QmFinal");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   URI AUTHORIZATION TESTS                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_setAgentUri_byApprovedOperator()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        address operator = _randomAddress();
        string memory newUri = "ipfs://QmByOperator";

        // Owner approves operator
        vm.prank(address(SIMPLE_APP));
        IERC721(appRegistry).setApprovalForAll(operator, true);

        // Operator sets URI
        vm.prank(operator);
        identityRegistry.setAgentUri(agentId, newUri);

        assertEq(identityRegistry.tokenURI(agentId), newUri);
    }

    function test_setAgentUri_byTokenApproved()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        address approved = _randomAddress();
        string memory newUri = "ipfs://QmByApproved";

        // Owner approves specific address for token
        vm.prank(address(SIMPLE_APP));
        IERC721(appRegistry).approve(approved, agentId);

        // Approved address sets URI
        vm.prank(approved);
        identityRegistry.setAgentUri(agentId, newUri);

        assertEq(identityRegistry.tokenURI(agentId), newUri);
    }

    function test_setAgentUri_byOwner() external givenSimpleAppIsRegistered givenAgentIsRegistered {
        string memory newUri = "ipfs://QmByOwner";

        vm.prank(address(SIMPLE_APP));
        identityRegistry.setAgentUri(agentId, newUri);

        assertEq(identityRegistry.tokenURI(agentId), newUri);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   URI EDGE CASE TESTS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_setAgentUri_veryLongUri()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        // Create a very long URI
        string memory longUri = string(
            abi.encodePacked(
                "ipfs://Qm",
                "abcdefghijklmnopqrstuvwxyz012345",
                "abcdefghijklmnopqrstuvwxyz012345",
                "abcdefghijklmnopqrstuvwxyz012345",
                "abcdefghijklmnopqrstuvwxyz012345"
            )
        );

        vm.prank(address(SIMPLE_APP));
        identityRegistry.setAgentUri(agentId, longUri);

        assertEq(identityRegistry.tokenURI(agentId), longUri);
    }

    function test_setAgentUri_specialCharacters()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        string memory uriWithSpecialChars = "https://example.com/agent?id=123&type=test#section";

        vm.prank(address(SIMPLE_APP));
        identityRegistry.setAgentUri(agentId, uriWithSpecialChars);

        assertEq(identityRegistry.tokenURI(agentId), uriWithSpecialChars);
    }

    function test_setAgentUri_unicodeCharacters()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        string memory unicodeUri = unicode"ipfs://Qm测试🎉";

        vm.prank(address(SIMPLE_APP));
        identityRegistry.setAgentUri(agentId, unicodeUri);

        assertEq(identityRegistry.tokenURI(agentId), unicodeUri);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   REGISTER REVERT TESTS                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_revertWhen_register_alreadyPromoted()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        // Try to register again - should revert because app already has an agent NFT
        vm.prank(address(SIMPLE_APP));
        vm.expectRevert(IdentityRegistry__AgentAlreadyPromoted.selector);
        identityRegistry.register();
    }

    function test_revertWhen_register_withUri_alreadyPromoted()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        vm.prank(address(SIMPLE_APP));
        vm.expectRevert(IdentityRegistry__AgentAlreadyPromoted.selector);
        identityRegistry.register("ipfs://QmAnother");
    }

    function test_revertWhen_register_withUriAndMetadata_alreadyPromoted()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        MetadataEntry[] memory metadata = new MetadataEntry[](1);
        metadata[0] = MetadataEntry({metadataKey: "name", metadataValue: bytes("Test")});

        vm.prank(address(SIMPLE_APP));
        vm.expectRevert(IdentityRegistry__AgentAlreadyPromoted.selector);
        identityRegistry.register("ipfs://QmAnother", metadata);
    }

    function test_revertWhen_register_notRegisteredApp() external {
        // Create an address that's not registered as an app
        address notAnApp = _randomAddress();

        vm.prank(notAnApp);
        vm.expectRevert(IdentityRegistry__AgentNotRegistered.selector);
        identityRegistry.register();
    }

    function test_revertWhen_register_withUri_notRegisteredApp() external {
        address notAnApp = _randomAddress();

        vm.prank(notAnApp);
        vm.expectRevert(IdentityRegistry__AgentNotRegistered.selector);
        identityRegistry.register("ipfs://QmTest");
    }

    function test_revertWhen_register_withUriAndMetadata_notRegisteredApp() external {
        address notAnApp = _randomAddress();
        MetadataEntry[] memory metadata = new MetadataEntry[](1);
        metadata[0] = MetadataEntry({metadataKey: "name", metadataValue: bytes("Test")});

        vm.prank(notAnApp);
        vm.expectRevert(IdentityRegistry__AgentNotRegistered.selector);
        identityRegistry.register("ipfs://QmTest", metadata);
    }

    function test_revertWhen_register_banned() external givenSimpleAppIsRegistered {
        // Ban the app
        vm.prank(deployer);
        AppRegistryFacet(appRegistry).adminBanApp(address(SIMPLE_APP));

        // Try to register - should revert because app is banned
        vm.prank(address(SIMPLE_APP));
        vm.expectRevert(IdentityRegistry__AgentBanned.selector);
        identityRegistry.register();
    }

    function test_revertWhen_register_withUri_banned() external givenSimpleAppIsRegistered {
        vm.prank(deployer);
        AppRegistryFacet(appRegistry).adminBanApp(address(SIMPLE_APP));

        vm.prank(address(SIMPLE_APP));
        vm.expectRevert(IdentityRegistry__AgentBanned.selector);
        identityRegistry.register("ipfs://QmTest");
    }

    function test_revertWhen_register_withUriAndMetadata_banned()
        external
        givenSimpleAppIsRegistered
    {
        vm.prank(deployer);
        AppRegistryFacet(appRegistry).adminBanApp(address(SIMPLE_APP));

        MetadataEntry[] memory metadata = new MetadataEntry[](1);
        metadata[0] = MetadataEntry({metadataKey: "name", metadataValue: bytes("Test")});

        vm.prank(address(SIMPLE_APP));
        vm.expectRevert(IdentityRegistry__AgentBanned.selector);
        identityRegistry.register("ipfs://QmTest", metadata);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                PROMOTE AGENT REVERT TESTS                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_revertWhen_promoteAgent_agentAlreadyPromoted()
        external
        givenSimpleAppIsRegistered
    {
        string memory uri1 = "ipfs://QmTest1";
        string memory uri2 = "ipfs://QmTest2";
        MetadataEntry[] memory metadata = new MetadataEntry[](0);

        vm.startPrank(DEFAULT_DEV);
        simpleApp.promoteAgent(uri1, metadata);

        vm.expectRevert(SimpleApp__AgentAlreadyPromoted.selector);
        simpleApp.promoteAgent(uri2, metadata);
        vm.stopPrank();
    }

    function test_revertWhen_promoteAgent_notOwner(
        string calldata uri,
        MetadataEntry[] memory metadata
    ) external givenSimpleAppIsRegistered {
        address notOwner = _randomAddress();
        vm.assume(notOwner != DEFAULT_DEV);

        vm.prank(notOwner);
        vm.expectRevert(abi.encodeWithSelector(IOwnableBase.Ownable__NotOwner.selector, notOwner));
        simpleApp.promoteAgent(uri, metadata);
    }

    function test_revertWhen_promoteAgent_notOwner_specificAddress()
        external
        givenSimpleAppIsRegistered
    {
        address notOwner = address(0xBEEF);
        string memory uri = "ipfs://QmTest";
        MetadataEntry[] memory metadata = new MetadataEntry[](0);

        vm.prank(notOwner);
        vm.expectRevert(abi.encodeWithSelector(IOwnableBase.Ownable__NotOwner.selector, notOwner));
        simpleApp.promoteAgent(uri, metadata);
    }

    function test_revertWhen_promoteAgent_zeroAddress() external givenSimpleAppIsRegistered {
        address notOwner = address(0);
        string memory uri = "ipfs://QmTest";
        MetadataEntry[] memory metadata = new MetadataEntry[](0);

        vm.prank(notOwner);
        vm.expectRevert(abi.encodeWithSelector(IOwnableBase.Ownable__NotOwner.selector, notOwner));
        simpleApp.promoteAgent(uri, metadata);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                SET METADATA REVERT TESTS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_revertWhen_setMetadata_notAuthorized()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        address unauthorized = _randomAddress();

        vm.prank(unauthorized);
        vm.expectRevert(IdentityRegistry__NotAuthorized.selector);
        identityRegistry.setMetadata(agentId, "name", bytes("Unauthorized"));
    }

    function test_revertWhen_setMetadata_notOwner()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        address notOwner = _randomAddress();
        vm.assume(notOwner != address(SIMPLE_APP));

        vm.prank(notOwner);
        vm.expectRevert(IdentityRegistry__NotAuthorized.selector);
        identityRegistry.setMetadata(agentId, "name", bytes("Not Owner"));
    }

    function test_revertWhen_setMetadata_nonExistentToken() external givenSimpleAppIsRegistered {
        uint256 nonExistentToken = 999;

        vm.prank(address(SIMPLE_APP));
        vm.expectRevert(IERC721ABase.OwnerQueryForNonexistentToken.selector);
        identityRegistry.setMetadata(nonExistentToken, "name", bytes("Test"));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                SET AGENT URI REVERT TESTS                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_revertWhen_setAgentUri_notAuthorized()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        address unauthorized = _randomAddress();

        vm.prank(unauthorized);
        vm.expectRevert(IdentityRegistry__NotAuthorized.selector);
        identityRegistry.setAgentUri(agentId, "ipfs://QmUnauthorized");
    }

    function test_revertWhen_setAgentUri_notOwner()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        address notOwner = _randomAddress();
        vm.assume(notOwner != address(SIMPLE_APP));

        vm.prank(notOwner);
        vm.expectRevert(IdentityRegistry__NotAuthorized.selector);
        identityRegistry.setAgentUri(agentId, "ipfs://QmNotOwner");
    }

    function test_revertWhen_setAgentUri_nonExistentToken() external givenSimpleAppIsRegistered {
        uint256 nonExistentToken = 999;

        vm.prank(address(SIMPLE_APP));
        vm.expectRevert(IERC721ABase.OwnerQueryForNonexistentToken.selector);
        identityRegistry.setAgentUri(nonExistentToken, "ipfs://QmTest");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   TOKEN URI REVERT TESTS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_revertWhen_tokenURI_nonExistentToken() external {
        uint256 nonExistentToken = 999;

        vm.expectRevert(IdentityRegistry__AgentDoesNotExist.selector);
        identityRegistry.tokenURI(nonExistentToken);
    }

    function test_revertWhen_tokenURI_tokenIdZero() external {
        // Token IDs start at 1, so 0 should not exist
        vm.expectRevert(IdentityRegistry__AgentDoesNotExist.selector);
        identityRegistry.tokenURI(0);
    }

    function test_revertWhen_tokenURI_afterBurn()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        // Transfer to a burn address (0 address will revert in ERC721A, so we use 0xdead)
        address burnAddress = address(0xdead);

        vm.prank(address(SIMPLE_APP));
        IERC721(appRegistry).transferFrom(address(SIMPLE_APP), burnAddress, agentId);

        // Token still exists after transfer, so this should succeed
        string memory uri = identityRegistry.tokenURI(agentId);
        assertEq(uri, initialUri, "URI should still be retrievable after transfer");

        // Verify new owner
        assertEq(IERC721(appRegistry).ownerOf(agentId), burnAddress);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   FUZZ REVERT TESTS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_revertWhen_setMetadata_randomUnauthorized(
        address unauthorized
    ) external givenSimpleAppIsRegistered givenAgentIsRegistered {
        vm.assume(unauthorized != address(SIMPLE_APP));
        vm.assume(unauthorized != address(0));

        vm.prank(unauthorized);
        vm.expectRevert(IdentityRegistry__NotAuthorized.selector);
        identityRegistry.setMetadata(agentId, "name", bytes("Test"));
    }

    function test_revertWhen_setAgentUri_randomUnauthorized(
        address unauthorized
    ) external givenSimpleAppIsRegistered givenAgentIsRegistered {
        vm.assume(unauthorized != address(SIMPLE_APP));
        vm.assume(unauthorized != address(0));

        vm.prank(unauthorized);
        vm.expectRevert(IdentityRegistry__NotAuthorized.selector);
        identityRegistry.setAgentUri(agentId, "ipfs://QmTest");
    }

    function test_revertWhen_tokenURI_randomNonExistentToken(
        uint256 tokenId
    ) external givenSimpleAppIsRegistered givenAgentIsRegistered {
        vm.assume(tokenId != agentId);
        vm.assume(tokenId != 0);

        vm.expectRevert(IdentityRegistry__AgentDoesNotExist.selector);
        identityRegistry.tokenURI(tokenId);
    }
}
