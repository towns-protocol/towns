// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IValidationRegistryBase} from "../../src/apps/facets/validation/IValidationRegistry.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

// contracts
import {AppRegistryBaseTest} from "./AppRegistryBase.t.sol";

contract ValidationRegistryTest is AppRegistryBaseTest, IValidationRegistryBase {
    // Default test data
    address internal DEFAULT_VALIDATOR;
    address internal SECOND_VALIDATOR;
    address internal THIRD_VALIDATOR;

    string internal DEFAULT_REQUEST_URI = "ipfs://QmRequestData";
    bytes32 internal DEFAULT_REQUEST_HASH = bytes32(keccak256("request1"));
    bytes32 internal SECOND_REQUEST_HASH = bytes32(keccak256("request2"));
    bytes32 internal THIRD_REQUEST_HASH = bytes32(keccak256("request3"));

    string internal DEFAULT_RESPONSE_URI = "ipfs://QmResponseData";
    bytes32 internal DEFAULT_RESPONSE_HASH = bytes32(keccak256("response1"));
    bytes32 internal DEFAULT_TAG = bytes32("accuracy");
    bytes32 internal SECOND_TAG = bytes32("performance");
    bytes32 internal EMPTY_TAG = bytes32(0);

    uint8 internal DEFAULT_RESPONSE_SCORE = 85;
    uint8 internal HIGH_SCORE = 100;
    uint8 internal MID_SCORE = 50;
    uint8 internal LOW_SCORE = 0;

    uint256 internal agentId;
    uint256 internal secondAgentId;

    function setUp() public override {
        super.setUp();
        DEFAULT_VALIDATOR = _randomAddress();
        SECOND_VALIDATOR = _randomAddress();
        THIRD_VALIDATOR = _randomAddress();
    }

    modifier givenAgentIsRegistered() {
        vm.prank(address(SIMPLE_APP));
        agentId = identityRegistry.register(DEFAULT_REQUEST_URI);
        _;
    }

    modifier givenSecondAgentIsRegistered() {
        address secondApp = _createTestApp(new bytes32[](1));
        vm.prank(secondApp);
        secondAgentId = identityRegistry.register("ipfs://QmSecondAgent");
        _;
    }

    modifier givenValidationRequestExists() {
        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );
        _;
    }

    modifier givenMultipleValidationRequestsExist() {
        // Request 1: agent1 -> validator1
        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );

        // Request 2: agent1 -> validator2
        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            SECOND_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            SECOND_REQUEST_HASH
        );

        // Request 3: agent2 -> validator1
        address secondApp = identityRegistry.ownerOf(secondAgentId);
        vm.prank(secondApp);
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            secondAgentId,
            DEFAULT_REQUEST_URI,
            THIRD_REQUEST_HASH
        );
        _;
    }

    modifier givenValidationResponseExists() {
        vm.prank(DEFAULT_VALIDATOR);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            DEFAULT_RESPONSE_SCORE,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );
        _;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                VALIDATION REQUEST TESTS                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_validationRequest() external givenSimpleAppIsRegistered givenAgentIsRegistered {
        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );

        (address validator, uint256 returnedAgentId, , , uint256 lastUpdate) = validationRegistry
            .getValidationStatus(DEFAULT_REQUEST_HASH);

        assertEq(validator, DEFAULT_VALIDATOR, "Validator should be stored");
        assertEq(returnedAgentId, agentId, "Agent ID should be stored");
        assertGt(lastUpdate, 0, "Last update should be set");
    }

    function test_validationRequest_emitsEvent()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        vm.expectEmit(true, true, true, true, appRegistry);
        emit ValidationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );

        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );
    }

    function test_validationRequest_storesInAgentMapping()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );

        bytes32[] memory agentValidations = validationRegistry.getAgentValidations(agentId);
        assertEq(agentValidations.length, 1, "Should have 1 validation");
        assertEq(agentValidations[0], DEFAULT_REQUEST_HASH, "Should store request hash");
    }

    function test_validationRequest_storesInValidatorMapping()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );

        bytes32[] memory validatorRequests = validationRegistry.getValidatorRequests(
            DEFAULT_VALIDATOR
        );
        assertEq(validatorRequests.length, 1, "Should have 1 request");
        assertEq(validatorRequests[0], DEFAULT_REQUEST_HASH, "Should store request hash");
    }

    function test_validationRequest_multipleRequestsSameAgent()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        vm.startPrank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );
        validationRegistry.validationRequest(
            SECOND_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            SECOND_REQUEST_HASH
        );
        vm.stopPrank();

        bytes32[] memory agentValidations = validationRegistry.getAgentValidations(agentId);
        assertEq(agentValidations.length, 2, "Should have 2 validations");
    }

    function test_validationRequest_multipleAgentsSameValidator()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenSecondAgentIsRegistered
    {
        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );

        address secondApp = identityRegistry.ownerOf(secondAgentId);
        vm.prank(secondApp);
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            secondAgentId,
            DEFAULT_REQUEST_URI,
            SECOND_REQUEST_HASH
        );

        bytes32[] memory validatorRequests = validationRegistry.getValidatorRequests(
            DEFAULT_VALIDATOR
        );
        assertEq(validatorRequests.length, 2, "Should have 2 requests");
    }

    function test_validationRequest_fuzzUri(
        string calldata uri,
        bytes32 requestHash
    ) external givenSimpleAppIsRegistered givenAgentIsRegistered {
        vm.assume(bytes(uri).length > 0 && bytes(uri).length < 1000);

        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(DEFAULT_VALIDATOR, agentId, uri, requestHash);

        (address validator, uint256 returnedAgentId, , , ) = validationRegistry.getValidationStatus(
            requestHash
        );
        assertEq(validator, DEFAULT_VALIDATOR, "Should store validator");
        assertEq(returnedAgentId, agentId, "Should store agent ID");
    }

    function test_validationRequest_byApprovedOperator()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        address operator = _randomAddress();

        vm.prank(address(SIMPLE_APP));
        IERC721(appRegistry).setApprovalForAll(operator, true);

        vm.prank(operator);
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );

        (address validator, , , , ) = validationRegistry.getValidationStatus(DEFAULT_REQUEST_HASH);
        assertEq(validator, DEFAULT_VALIDATOR, "Should store validator");
    }

    function test_validationRequest_withEmptyUri()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(DEFAULT_VALIDATOR, agentId, "", DEFAULT_REQUEST_HASH);

        (address validator, , , , ) = validationRegistry.getValidationStatus(DEFAULT_REQUEST_HASH);
        assertEq(validator, DEFAULT_VALIDATOR, "Should work with empty URI");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                VALIDATION RESPONSE TESTS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_validationResponse()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenValidationRequestExists
    {
        vm.prank(DEFAULT_VALIDATOR);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            DEFAULT_RESPONSE_SCORE,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        (, , uint8 response, bytes32 tag, uint256 lastUpdate) = validationRegistry
            .getValidationStatus(DEFAULT_REQUEST_HASH);

        assertEq(response, DEFAULT_RESPONSE_SCORE, "Response score should be stored");
        assertEq(tag, DEFAULT_TAG, "Tag should be stored");
        assertGt(lastUpdate, 0, "Last update should be set");
    }

    function test_validationResponse_emitsEvent()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenValidationRequestExists
    {
        vm.expectEmit(true, true, true, true, appRegistry);
        emit ValidationResponse(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_HASH,
            DEFAULT_RESPONSE_SCORE,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        vm.prank(DEFAULT_VALIDATOR);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            DEFAULT_RESPONSE_SCORE,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );
    }

    function test_validationResponse_updatesTimestamp()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenValidationRequestExists
    {
        (, , , , uint256 timestampBefore) = validationRegistry.getValidationStatus(
            DEFAULT_REQUEST_HASH
        );

        vm.warp(block.timestamp + 100);

        vm.prank(DEFAULT_VALIDATOR);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            DEFAULT_RESPONSE_SCORE,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        (, , , , uint256 timestampAfter) = validationRegistry.getValidationStatus(
            DEFAULT_REQUEST_HASH
        );

        assertGt(timestampAfter, timestampBefore, "Timestamp should be updated");
    }

    function test_validationResponse_multipleResponses()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenValidationRequestExists
    {
        vm.startPrank(DEFAULT_VALIDATOR);

        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            50,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        (, , uint8 firstResponse, , ) = validationRegistry.getValidationStatus(
            DEFAULT_REQUEST_HASH
        );
        assertEq(firstResponse, 50, "First response should be 50");

        vm.warp(block.timestamp + 100);

        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            100,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            SECOND_TAG
        );

        (, , uint8 secondResponse, bytes32 tag, ) = validationRegistry.getValidationStatus(
            DEFAULT_REQUEST_HASH
        );
        assertEq(secondResponse, 100, "Second response should be 100");
        assertEq(tag, SECOND_TAG, "Tag should be updated");

        vm.stopPrank();
    }

    function test_validationResponse_withDifferentScores()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        // Create 3 requests for different scores
        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );

        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            SECOND_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            SECOND_REQUEST_HASH
        );

        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            THIRD_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            THIRD_REQUEST_HASH
        );

        vm.prank(DEFAULT_VALIDATOR);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            LOW_SCORE,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        vm.prank(SECOND_VALIDATOR);
        validationRegistry.validationResponse(
            SECOND_REQUEST_HASH,
            MID_SCORE,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        vm.prank(THIRD_VALIDATOR);
        validationRegistry.validationResponse(
            THIRD_REQUEST_HASH,
            HIGH_SCORE,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        (, , uint8 score1, , ) = validationRegistry.getValidationStatus(DEFAULT_REQUEST_HASH);
        (, , uint8 score2, , ) = validationRegistry.getValidationStatus(SECOND_REQUEST_HASH);
        (, , uint8 score3, , ) = validationRegistry.getValidationStatus(THIRD_REQUEST_HASH);

        assertEq(score1, LOW_SCORE, "First score should be 0");
        assertEq(score2, MID_SCORE, "Second score should be 50");
        assertEq(score3, HIGH_SCORE, "Third score should be 100");
    }

    function test_validationResponse_withEmptyResponseUri()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenValidationRequestExists
    {
        vm.prank(DEFAULT_VALIDATOR);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            DEFAULT_RESPONSE_SCORE,
            "",
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        (, , uint8 response, , ) = validationRegistry.getValidationStatus(DEFAULT_REQUEST_HASH);
        assertEq(response, DEFAULT_RESPONSE_SCORE, "Should work with empty response URI");
    }

    function test_validationResponse_withZeroTagAndHash()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenValidationRequestExists
    {
        vm.prank(DEFAULT_VALIDATOR);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            DEFAULT_RESPONSE_SCORE,
            DEFAULT_RESPONSE_URI,
            bytes32(0),
            bytes32(0)
        );

        (, , uint8 response, bytes32 tag, ) = validationRegistry.getValidationStatus(
            DEFAULT_REQUEST_HASH
        );
        assertEq(response, DEFAULT_RESPONSE_SCORE, "Response should be stored");
        assertEq(tag, bytes32(0), "Tag should be zero");
    }

    function test_validationResponse_fuzzScore(
        uint8 score
    ) external givenSimpleAppIsRegistered givenAgentIsRegistered givenValidationRequestExists {
        score = uint8(bound(score, 0, 100));

        vm.prank(DEFAULT_VALIDATOR);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            score,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        (, , uint8 response, , ) = validationRegistry.getValidationStatus(DEFAULT_REQUEST_HASH);
        assertEq(response, score, "Fuzzed score should be stored");
    }

    function test_validationResponse_timestampUpdatesCorrectly()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenValidationRequestExists
    {
        uint256 timestamp1 = block.timestamp;

        vm.prank(DEFAULT_VALIDATOR);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            50,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        (, , , , uint256 lastUpdate1) = validationRegistry.getValidationStatus(
            DEFAULT_REQUEST_HASH
        );
        assertEq(lastUpdate1, timestamp1, "First timestamp should match");

        vm.warp(block.timestamp + 1000);
        uint256 timestamp2 = block.timestamp;

        vm.prank(DEFAULT_VALIDATOR);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            75,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        (, , , , uint256 lastUpdate2) = validationRegistry.getValidationStatus(
            DEFAULT_REQUEST_HASH
        );
        assertEq(lastUpdate2, timestamp2, "Second timestamp should match");
        assertGt(lastUpdate2, lastUpdate1, "Second timestamp should be greater");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*              VALIDATION STATUS QUERY TESTS                 */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_getValidationStatus_afterRequest()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenValidationRequestExists
    {
        (
            address validator,
            uint256 returnedAgentId,
            uint8 response,
            bytes32 tag,
            uint256 lastUpdate
        ) = validationRegistry.getValidationStatus(DEFAULT_REQUEST_HASH);

        assertEq(validator, DEFAULT_VALIDATOR, "Validator should match");
        assertEq(returnedAgentId, agentId, "Agent ID should match");
        assertEq(response, 0, "Response should be 0 before response");
        assertEq(tag, bytes32(0), "Tag should be empty before response");
        assertGt(lastUpdate, 0, "Last update should be set");
    }

    function test_getValidationStatus_afterResponse()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenValidationRequestExists
        givenValidationResponseExists
    {
        (
            address validator,
            uint256 returnedAgentId,
            uint8 response,
            bytes32 tag,
            uint256 lastUpdate
        ) = validationRegistry.getValidationStatus(DEFAULT_REQUEST_HASH);

        assertEq(validator, DEFAULT_VALIDATOR, "Validator should match");
        assertEq(returnedAgentId, agentId, "Agent ID should match");
        assertEq(response, DEFAULT_RESPONSE_SCORE, "Response should match");
        assertEq(tag, DEFAULT_TAG, "Tag should match");
        assertGt(lastUpdate, 0, "Last update should be set");
    }

    function test_getValidationStatus_nonExistent() external view {
        bytes32 nonExistentHash = bytes32(keccak256("nonexistent"));
        (
            address validator,
            uint256 returnedAgentId,
            uint8 response,
            bytes32 tag,
            uint256 lastUpdate
        ) = validationRegistry.getValidationStatus(nonExistentHash);

        assertEq(validator, address(0), "Validator should be zero");
        assertEq(returnedAgentId, 0, "Agent ID should be zero");
        assertEq(response, 0, "Response should be zero");
        assertEq(tag, bytes32(0), "Tag should be zero");
        assertEq(lastUpdate, 0, "Last update should be zero");
    }

    function test_getValidationStatus_afterMultipleUpdates()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenValidationRequestExists
    {
        vm.startPrank(DEFAULT_VALIDATOR);

        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            25,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            75,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            SECOND_TAG
        );

        vm.stopPrank();

        (, , uint8 response, bytes32 tag, ) = validationRegistry.getValidationStatus(
            DEFAULT_REQUEST_HASH
        );

        assertEq(response, 75, "Should return latest response");
        assertEq(tag, SECOND_TAG, "Should return latest tag");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*              SUMMARY/AGGREGATION TESTS                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_getSummary_withNoFilters()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenSecondAgentIsRegistered
        givenMultipleValidationRequestsExist
    {
        // Add responses
        vm.prank(DEFAULT_VALIDATOR);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            HIGH_SCORE,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        vm.prank(SECOND_VALIDATOR);
        validationRegistry.validationResponse(
            SECOND_REQUEST_HASH,
            MID_SCORE,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        address[] memory emptyValidators = new address[](0);
        (uint64 count, uint8 avgResponse) = validationRegistry.getSummary(
            agentId,
            emptyValidators,
            EMPTY_TAG
        );

        assertEq(count, 2, "Should count 2 validations for agent");
        assertEq(avgResponse, (HIGH_SCORE + MID_SCORE) / 2, "Average should be correct");
    }

    function test_getSummary_filteredBySingleValidator()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenSecondAgentIsRegistered
        givenMultipleValidationRequestsExist
    {
        vm.prank(DEFAULT_VALIDATOR);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            HIGH_SCORE,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        vm.prank(SECOND_VALIDATOR);
        validationRegistry.validationResponse(
            SECOND_REQUEST_HASH,
            LOW_SCORE,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        address[] memory validators = new address[](1);
        validators[0] = DEFAULT_VALIDATOR;

        (uint64 count, uint8 avgResponse) = validationRegistry.getSummary(
            agentId,
            validators,
            EMPTY_TAG
        );

        assertEq(count, 1, "Should count only 1 validation from filtered validator");
        assertEq(avgResponse, HIGH_SCORE, "Average should be from filtered validator only");
    }

    function test_getSummary_filteredByMultipleValidators()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );

        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            SECOND_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            SECOND_REQUEST_HASH
        );

        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            THIRD_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            THIRD_REQUEST_HASH
        );

        vm.prank(DEFAULT_VALIDATOR);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            100,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        vm.prank(SECOND_VALIDATOR);
        validationRegistry.validationResponse(
            SECOND_REQUEST_HASH,
            80,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        vm.prank(THIRD_VALIDATOR);
        validationRegistry.validationResponse(
            THIRD_REQUEST_HASH,
            20,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        address[] memory validators = new address[](2);
        validators[0] = DEFAULT_VALIDATOR;
        validators[1] = SECOND_VALIDATOR;

        (uint64 count, uint8 avgResponse) = validationRegistry.getSummary(
            agentId,
            validators,
            EMPTY_TAG
        );

        assertEq(count, 2, "Should count 2 validations from filtered validators");
        assertEq(avgResponse, (100 + 80) / 2, "Average should be from filtered validators");
    }

    function test_getSummary_filteredByTag()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );

        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            SECOND_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            SECOND_REQUEST_HASH
        );

        vm.prank(DEFAULT_VALIDATOR);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            HIGH_SCORE,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        vm.prank(SECOND_VALIDATOR);
        validationRegistry.validationResponse(
            SECOND_REQUEST_HASH,
            LOW_SCORE,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            SECOND_TAG
        );

        address[] memory emptyValidators = new address[](0);
        (uint64 count, uint8 avgResponse) = validationRegistry.getSummary(
            agentId,
            emptyValidators,
            DEFAULT_TAG
        );

        assertEq(count, 1, "Should count only validation with matching tag");
        assertEq(avgResponse, HIGH_SCORE, "Average should be from matching tag");
    }

    function test_getSummary_filteredByValidatorsAndTag()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );

        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            SECOND_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            SECOND_REQUEST_HASH
        );

        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            THIRD_REQUEST_HASH
        );

        vm.prank(DEFAULT_VALIDATOR);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            HIGH_SCORE,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        vm.prank(SECOND_VALIDATOR);
        validationRegistry.validationResponse(
            SECOND_REQUEST_HASH,
            MID_SCORE,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        vm.prank(DEFAULT_VALIDATOR);
        validationRegistry.validationResponse(
            THIRD_REQUEST_HASH,
            LOW_SCORE,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            SECOND_TAG
        );

        address[] memory validators = new address[](1);
        validators[0] = DEFAULT_VALIDATOR;

        (uint64 count, uint8 avgResponse) = validationRegistry.getSummary(
            agentId,
            validators,
            DEFAULT_TAG
        );

        assertEq(count, 1, "Should count only validation matching both filters");
        assertEq(avgResponse, HIGH_SCORE, "Average should match filtered validation");
    }

    function test_getSummary_withNoValidations()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        address[] memory emptyValidators = new address[](0);
        (uint64 count, uint8 avgResponse) = validationRegistry.getSummary(
            agentId,
            emptyValidators,
            EMPTY_TAG
        );

        assertEq(count, 0, "Count should be 0");
        assertEq(avgResponse, 0, "Average should be 0");
    }

    function test_getSummary_withOnlyRequests()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenValidationRequestExists
    {
        address[] memory emptyValidators = new address[](0);
        (uint64 count, uint8 avgResponse) = validationRegistry.getSummary(
            agentId,
            emptyValidators,
            EMPTY_TAG
        );

        assertEq(count, 0, "Count should be 0 without responses");
        assertEq(avgResponse, 0, "Average should be 0 without responses");
    }

    function test_getSummary_averageCalculation()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );

        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            SECOND_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            SECOND_REQUEST_HASH
        );

        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            THIRD_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            THIRD_REQUEST_HASH
        );

        vm.prank(DEFAULT_VALIDATOR);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            0,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        vm.prank(SECOND_VALIDATOR);
        validationRegistry.validationResponse(
            SECOND_REQUEST_HASH,
            50,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        vm.prank(THIRD_VALIDATOR);
        validationRegistry.validationResponse(
            THIRD_REQUEST_HASH,
            100,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        address[] memory emptyValidators = new address[](0);
        (uint64 count, uint8 avgResponse) = validationRegistry.getSummary(
            agentId,
            emptyValidators,
            EMPTY_TAG
        );

        assertEq(count, 3, "Count should be 3");
        assertEq(avgResponse, (0 + 50 + 100) / 3, "Average should be 50");
    }

    function test_getSummary_includesZeroScoreWithMetadata()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );

        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            SECOND_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            SECOND_REQUEST_HASH
        );

        // Submit zero score with hash (no tag)
        vm.prank(DEFAULT_VALIDATOR);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            0,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            bytes32(0)
        );

        // Submit zero score with tag (no hash)
        vm.prank(SECOND_VALIDATOR);
        validationRegistry.validationResponse(
            SECOND_REQUEST_HASH,
            0,
            DEFAULT_RESPONSE_URI,
            bytes32(0),
            DEFAULT_TAG
        );

        address[] memory emptyValidators = new address[](0);
        (uint64 count, uint8 avgResponse) = validationRegistry.getSummary(
            agentId,
            emptyValidators,
            EMPTY_TAG
        );

        assertEq(count, 2, "Should count both zero-score responses with metadata");
        assertEq(avgResponse, 0, "Average of two zeros should be 0");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*          AGENT AND VALIDATOR QUERY TESTS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_getAgentValidations_emptyForNoValidations()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        bytes32[] memory validations = validationRegistry.getAgentValidations(agentId);
        assertEq(validations.length, 0, "Should return empty array");
    }

    function test_getAgentValidations_singleValidation()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenValidationRequestExists
    {
        bytes32[] memory validations = validationRegistry.getAgentValidations(agentId);
        assertEq(validations.length, 1, "Should return 1 validation");
        assertEq(validations[0], DEFAULT_REQUEST_HASH, "Should return correct hash");
    }

    function test_getAgentValidations_multipleValidations()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        vm.startPrank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );
        validationRegistry.validationRequest(
            SECOND_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            SECOND_REQUEST_HASH
        );
        validationRegistry.validationRequest(
            THIRD_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            THIRD_REQUEST_HASH
        );
        vm.stopPrank();

        bytes32[] memory validations = validationRegistry.getAgentValidations(agentId);
        assertEq(validations.length, 3, "Should return 3 validations");
        assertContains(validations, DEFAULT_REQUEST_HASH);
        assertContains(validations, SECOND_REQUEST_HASH);
        assertContains(validations, THIRD_REQUEST_HASH);
    }

    function test_getAgentValidations_differentAgents()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenSecondAgentIsRegistered
    {
        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );

        address secondApp = identityRegistry.ownerOf(secondAgentId);
        vm.prank(secondApp);
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            secondAgentId,
            DEFAULT_REQUEST_URI,
            SECOND_REQUEST_HASH
        );

        bytes32[] memory validations1 = validationRegistry.getAgentValidations(agentId);
        bytes32[] memory validations2 = validationRegistry.getAgentValidations(secondAgentId);

        assertEq(validations1.length, 1, "Agent 1 should have 1 validation");
        assertEq(validations2.length, 1, "Agent 2 should have 1 validation");
        assertEq(validations1[0], DEFAULT_REQUEST_HASH, "Agent 1 hash should match");
        assertEq(validations2[0], SECOND_REQUEST_HASH, "Agent 2 hash should match");
    }

    function test_getValidatorRequests_emptyForNoRequests() external view {
        bytes32[] memory requests = validationRegistry.getValidatorRequests(DEFAULT_VALIDATOR);
        assertEq(requests.length, 0, "Should return empty array");
    }

    function test_getValidatorRequests_singleRequest()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenValidationRequestExists
    {
        bytes32[] memory requests = validationRegistry.getValidatorRequests(DEFAULT_VALIDATOR);
        assertEq(requests.length, 1, "Should return 1 request");
        assertEq(requests[0], DEFAULT_REQUEST_HASH, "Should return correct hash");
    }

    function test_getValidatorRequests_multipleRequests()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenSecondAgentIsRegistered
    {
        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );

        address secondApp = identityRegistry.ownerOf(secondAgentId);
        vm.prank(secondApp);
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            secondAgentId,
            DEFAULT_REQUEST_URI,
            SECOND_REQUEST_HASH
        );

        bytes32[] memory requests = validationRegistry.getValidatorRequests(DEFAULT_VALIDATOR);
        assertEq(requests.length, 2, "Should return 2 requests");
        assertContains(requests, DEFAULT_REQUEST_HASH);
        assertContains(requests, SECOND_REQUEST_HASH);
    }

    function test_getValidatorRequests_differentValidators()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        vm.startPrank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );
        validationRegistry.validationRequest(
            SECOND_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            SECOND_REQUEST_HASH
        );
        vm.stopPrank();

        bytes32[] memory requests1 = validationRegistry.getValidatorRequests(DEFAULT_VALIDATOR);
        bytes32[] memory requests2 = validationRegistry.getValidatorRequests(SECOND_VALIDATOR);

        assertEq(requests1.length, 1, "Validator 1 should have 1 request");
        assertEq(requests2.length, 1, "Validator 2 should have 1 request");
        assertEq(requests1[0], DEFAULT_REQUEST_HASH, "Validator 1 hash should match");
        assertEq(requests2[0], SECOND_REQUEST_HASH, "Validator 2 hash should match");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  AUTHORIZATION TESTS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_authorization_ownerCanCreateRequest()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );

        bytes32[] memory validations = validationRegistry.getAgentValidations(agentId);
        assertEq(validations.length, 1, "Owner should be able to create request");
    }

    function test_authorization_approvedOperatorCanCreateRequest()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        address operator = _randomAddress();

        vm.prank(address(SIMPLE_APP));
        IERC721(appRegistry).setApprovalForAll(operator, true);

        vm.prank(operator);
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );

        bytes32[] memory validations = validationRegistry.getAgentValidations(agentId);
        assertEq(validations.length, 1, "Approved operator should be able to create request");
    }

    function test_authorization_tokenApprovedCanCreateRequest()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        address approved = _randomAddress();

        vm.prank(address(SIMPLE_APP));
        IERC721(appRegistry).approve(approved, agentId);

        vm.prank(approved);
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );

        bytes32[] memory validations = validationRegistry.getAgentValidations(agentId);
        assertEq(validations.length, 1, "Token-approved address should be able to create request");
    }

    function test_authorization_onlyValidatorCanSubmitResponse()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenValidationRequestExists
    {
        vm.prank(DEFAULT_VALIDATOR);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            DEFAULT_RESPONSE_SCORE,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        (, , uint8 response, , ) = validationRegistry.getValidationStatus(DEFAULT_REQUEST_HASH);
        assertEq(response, DEFAULT_RESPONSE_SCORE, "Validator should be able to submit response");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*          REVERT TESTS - VALIDATION REQUESTS                */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_revertWhen_validationRequest_invalidValidator()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        vm.prank(address(SIMPLE_APP));
        vm.expectRevert(ValidationRegistry__InvalidValidator.selector);
        validationRegistry.validationRequest(
            address(0),
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );
    }

    function test_revertWhen_validationRequest_invalidAgent() external givenSimpleAppIsRegistered {
        vm.prank(address(SIMPLE_APP));
        vm.expectRevert(ValidationRegistry__InvalidAgent.selector);
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            0,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );
    }

    function test_revertWhen_validationRequest_agentNotExists()
        external
        givenSimpleAppIsRegistered
    {
        uint256 nonExistentAgentId = 999;

        vm.prank(address(SIMPLE_APP));
        vm.expectRevert(ValidationRegistry__AgentNotExists.selector);
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            nonExistentAgentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );
    }

    function test_revertWhen_validationRequest_notAuthorized()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        address unauthorized = _randomAddress();

        vm.prank(unauthorized);
        vm.expectRevert(ValidationRegistry__NotAuthorized.selector);
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );
    }

    function test_revertWhen_validationRequest_requestAlreadyExists()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenValidationRequestExists
    {
        vm.prank(address(SIMPLE_APP));
        vm.expectRevert(ValidationRegistry__RequestAlreadyExists.selector);
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );
    }

    function test_revertWhen_validationRequest_fuzzUnauthorized(
        address unauthorized
    ) external givenSimpleAppIsRegistered givenAgentIsRegistered {
        vm.assume(unauthorized != address(SIMPLE_APP));
        vm.assume(unauthorized != address(0));

        vm.prank(unauthorized);
        vm.expectRevert(ValidationRegistry__NotAuthorized.selector);
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*          REVERT TESTS - VALIDATION RESPONSES               */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_revertWhen_validationResponse_requestNotFound() external {
        bytes32 nonExistentHash = bytes32(keccak256("nonexistent"));

        vm.prank(DEFAULT_VALIDATOR);
        vm.expectRevert(ValidationRegistry__RequestNotFound.selector);
        validationRegistry.validationResponse(
            nonExistentHash,
            DEFAULT_RESPONSE_SCORE,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );
    }

    function test_revertWhen_validationResponse_notAuthorized()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenValidationRequestExists
    {
        address unauthorized = _randomAddress();

        vm.prank(unauthorized);
        vm.expectRevert(ValidationRegistry__NotAuthorized.selector);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            DEFAULT_RESPONSE_SCORE,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );
    }

    function test_revertWhen_validationResponse_invalidScore()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenValidationRequestExists
    {
        vm.prank(DEFAULT_VALIDATOR);
        vm.expectRevert(ValidationRegistry__InvalidResponseScore.selector);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            101,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );
    }

    function test_revertWhen_validationResponse_fuzzScoreAbove100(
        uint8 score
    ) external givenSimpleAppIsRegistered givenAgentIsRegistered givenValidationRequestExists {
        score = uint8(bound(score, 101, type(uint8).max));

        vm.prank(DEFAULT_VALIDATOR);
        vm.expectRevert(ValidationRegistry__InvalidResponseScore.selector);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            score,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );
    }

    function test_revertWhen_validationResponse_fuzzUnauthorized(
        address unauthorized
    ) external givenSimpleAppIsRegistered givenAgentIsRegistered givenValidationRequestExists {
        vm.assume(unauthorized != DEFAULT_VALIDATOR);
        vm.assume(unauthorized != address(0));

        vm.prank(unauthorized);
        vm.expectRevert(ValidationRegistry__NotAuthorized.selector);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            DEFAULT_RESPONSE_SCORE,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );
    }

    function test_revertWhen_validationResponse_zeroResponseWithoutMetadata()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenValidationRequestExists
    {
        vm.prank(DEFAULT_VALIDATOR);
        vm.expectRevert(ValidationRegistry__ZeroResponseRequiresMetadata.selector);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            0,
            DEFAULT_RESPONSE_URI,
            bytes32(0),
            bytes32(0)
        );
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      EDGE CASE TESTS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_edgeCase_responseScoreZero()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenValidationRequestExists
    {
        vm.prank(DEFAULT_VALIDATOR);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            LOW_SCORE,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        (, , uint8 response, , ) = validationRegistry.getValidationStatus(DEFAULT_REQUEST_HASH);
        assertEq(response, LOW_SCORE, "Score of 0 should be valid");
    }

    function test_edgeCase_responseScoreZeroWithHash()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenValidationRequestExists
    {
        vm.prank(DEFAULT_VALIDATOR);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            LOW_SCORE,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            bytes32(0)
        );

        (, , uint8 response, bytes32 tag, ) = validationRegistry.getValidationStatus(
            DEFAULT_REQUEST_HASH
        );
        assertEq(response, LOW_SCORE, "Score of 0 with hash should be valid");
        assertEq(tag, bytes32(0), "Tag should be zero");
    }

    function test_edgeCase_responseScoreZeroWithTag()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenValidationRequestExists
    {
        vm.prank(DEFAULT_VALIDATOR);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            LOW_SCORE,
            DEFAULT_RESPONSE_URI,
            bytes32(0),
            DEFAULT_TAG
        );

        (, , uint8 response, bytes32 tag, ) = validationRegistry.getValidationStatus(
            DEFAULT_REQUEST_HASH
        );
        assertEq(response, LOW_SCORE, "Score of 0 with tag should be valid");
        assertEq(tag, DEFAULT_TAG, "Tag should be set");
    }

    function test_edgeCase_responseScoreZeroWithHashAndTag()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenValidationRequestExists
    {
        vm.prank(DEFAULT_VALIDATOR);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            LOW_SCORE,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        (, , uint8 response, bytes32 tag, ) = validationRegistry.getValidationStatus(
            DEFAULT_REQUEST_HASH
        );
        assertEq(response, LOW_SCORE, "Score of 0 with hash and tag should be valid");
        assertEq(tag, DEFAULT_TAG, "Tag should be set");
    }

    function test_edgeCase_responseScoreMax()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenValidationRequestExists
    {
        vm.prank(DEFAULT_VALIDATOR);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            HIGH_SCORE,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        (, , uint8 response, , ) = validationRegistry.getValidationStatus(DEFAULT_REQUEST_HASH);
        assertEq(response, HIGH_SCORE, "Score of 100 should be valid");
    }

    function test_edgeCase_longUriString()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        string memory longUri = string(
            abi.encodePacked(
                "ipfs://Qm",
                "abcdefghijklmnopqrstuvwxyz012345",
                "abcdefghijklmnopqrstuvwxyz012345",
                "abcdefghijklmnopqrstuvwxyz012345",
                "abcdefghijklmnopqrstuvwxyz012345",
                "abcdefghijklmnopqrstuvwxyz012345"
            )
        );

        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            longUri,
            DEFAULT_REQUEST_HASH
        );

        bytes32[] memory validations = validationRegistry.getAgentValidations(agentId);
        assertEq(validations.length, 1, "Should work with long URI");
    }

    function test_edgeCase_emptyUriString()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(DEFAULT_VALIDATOR, agentId, "", DEFAULT_REQUEST_HASH);

        bytes32[] memory validations = validationRegistry.getAgentValidations(agentId);
        assertEq(validations.length, 1, "Should work with empty URI");
    }

    function test_edgeCase_multipleAgentsSameValidator()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenSecondAgentIsRegistered
    {
        vm.prank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );

        address secondApp = identityRegistry.ownerOf(secondAgentId);
        vm.prank(secondApp);
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            secondAgentId,
            DEFAULT_REQUEST_URI,
            SECOND_REQUEST_HASH
        );

        bytes32[] memory validatorRequests = validationRegistry.getValidatorRequests(
            DEFAULT_VALIDATOR
        );
        assertEq(validatorRequests.length, 2, "Validator should handle multiple agents");
    }

    function test_edgeCase_sameAgentMultipleValidators()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        vm.startPrank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );
        validationRegistry.validationRequest(
            SECOND_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            SECOND_REQUEST_HASH
        );
        validationRegistry.validationRequest(
            THIRD_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            THIRD_REQUEST_HASH
        );
        vm.stopPrank();

        bytes32[] memory agentValidations = validationRegistry.getAgentValidations(agentId);
        assertEq(
            agentValidations.length,
            3,
            "Agent should have validations from multiple validators"
        );
    }

    function test_edgeCase_repeatedResponseUpdates()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
        givenValidationRequestExists
    {
        vm.startPrank(DEFAULT_VALIDATOR);

        for (uint8 i; i < 5; ++i) {
            validationRegistry.validationResponse(
                DEFAULT_REQUEST_HASH,
                i * 20,
                DEFAULT_RESPONSE_URI,
                DEFAULT_RESPONSE_HASH,
                DEFAULT_TAG
            );
        }

        vm.stopPrank();

        (, , uint8 response, , ) = validationRegistry.getValidationStatus(DEFAULT_REQUEST_HASH);
        assertEq(response, 80, "Should retain latest response");
    }

    function test_edgeCase_zeroAddressQueryValidatorRequests() external view {
        bytes32[] memory requests = validationRegistry.getValidatorRequests(address(0));
        assertEq(requests.length, 0, "Should return empty array for zero address");
    }

    function test_edgeCase_zeroAgentIdQueryValidations() external givenSimpleAppIsRegistered {
        bytes32[] memory validations = validationRegistry.getAgentValidations(0);
        assertEq(validations.length, 0, "Should return empty array for zero agent ID");
    }

    function test_edgeCase_summaryWithMixedResponseStates()
        external
        givenSimpleAppIsRegistered
        givenAgentIsRegistered
    {
        vm.startPrank(address(SIMPLE_APP));
        validationRegistry.validationRequest(
            DEFAULT_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            DEFAULT_REQUEST_HASH
        );
        validationRegistry.validationRequest(
            SECOND_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            SECOND_REQUEST_HASH
        );
        validationRegistry.validationRequest(
            THIRD_VALIDATOR,
            agentId,
            DEFAULT_REQUEST_URI,
            THIRD_REQUEST_HASH
        );
        vm.stopPrank();

        // Only respond to first two
        vm.prank(DEFAULT_VALIDATOR);
        validationRegistry.validationResponse(
            DEFAULT_REQUEST_HASH,
            50,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        vm.prank(SECOND_VALIDATOR);
        validationRegistry.validationResponse(
            SECOND_REQUEST_HASH,
            100,
            DEFAULT_RESPONSE_URI,
            DEFAULT_RESPONSE_HASH,
            DEFAULT_TAG
        );

        address[] memory emptyValidators = new address[](0);
        (uint64 count, uint8 avgResponse) = validationRegistry.getSummary(
            agentId,
            emptyValidators,
            EMPTY_TAG
        );

        assertEq(count, 2, "Should count only requests with responses");
        assertEq(avgResponse, 75, "Average should be from responded requests only");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Utils                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function assertContains(bytes32[] memory arr, bytes32 value) internal pure override {
        for (uint256 i; i < arr.length; ++i) {
            if (arr[i] == value) return;
        }
        revert("Value not found in array");
    }
}
