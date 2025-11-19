// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IValidationRegistryBase} from "./IValidationRegistry.sol";

// libraries
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {ValidationRegistryStorage, ValidationStatus} from "./ValidationRegistryStorage.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";

// contracts
import {ERC721ABase} from "../../../diamond/facets/token/ERC721A/ERC721ABase.sol";

abstract contract ValidationRegistryBase is IValidationRegistryBase, ERC721ABase {
    using CustomRevert for bytes4;
    using EnumerableSetLib for EnumerableSetLib.Bytes32Set;

    function _requestValidation(
        address validatorAddress,
        uint256 agentId,
        string calldata requestUri,
        bytes32 requestHash
    ) internal {
        ValidationRegistryStorage.Layout storage $ = ValidationRegistryStorage.getLayout();
        if ($.validations[requestHash].validatorAddress != address(0))
            ValidationRegistry__RequestAlreadyExists.selector.revertWith();

        ValidationStatus storage validation = $.validations[requestHash];
        validation.validatorAddress = validatorAddress;
        validation.agentId = agentId;
        validation.lastUpdate = block.timestamp;

        $.requestByAgent[agentId].add(requestHash);
        $.requestByValidator[validatorAddress].add(requestHash);

        emit ValidationRequest(validatorAddress, agentId, requestUri, requestHash);
    }

    function _responseValidation(
        bytes32 requestHash,
        uint8 response,
        string calldata responseUri,
        bytes32 responseHash,
        bytes32 tag
    ) internal {
        ValidationRegistryStorage.Layout storage $ = ValidationRegistryStorage.getLayout();
        ValidationStatus storage val = $.validations[requestHash];
        if (val.validatorAddress == address(0))
            ValidationRegistry__RequestNotFound.selector.revertWith();
        if (msg.sender != val.validatorAddress)
            ValidationRegistry__NotAuthorized.selector.revertWith();
        if (response > 100) ValidationRegistry__InvalidResponseScore.selector.revertWith();
        if (response == 0 && responseHash == bytes32(0) && tag == bytes32(0)) {
            ValidationRegistry__ZeroResponseRequiresMetadata.selector.revertWith();
        }

        val.response = response;
        val.responseHash = responseHash;
        val.tag = tag;
        val.lastUpdate = block.timestamp;

        emit ValidationResponse(
            val.validatorAddress,
            val.agentId,
            requestHash,
            response,
            responseUri,
            responseHash,
            tag
        );
    }

    function _getValidationStatus(
        bytes32 requestHash
    ) internal view returns (ValidationStatus storage) {
        ValidationRegistryStorage.Layout storage $ = ValidationRegistryStorage.getLayout();
        return $.validations[requestHash];
    }

    function _getSummary(
        uint256 agentId,
        address[] calldata validatorAddresses,
        bytes32 tag
    ) internal view returns (uint64 count, uint8 avgResponse) {
        uint256 totalResponse;

        ValidationRegistryStorage.Layout storage $ = ValidationRegistryStorage.getLayout();
        EnumerableSetLib.Bytes32Set storage requests = $.requestByAgent[agentId];

        for (uint256 i; i < requests.length(); ++i) {
            // Fetch the validation status for the current requestHash
            ValidationStatus storage val = $.validations[requests.at(i)];

            // If no validatorAddresses filter is provided (i.e., length == 0), match any validator.
            // Otherwise, check if the validatorAddress matches any address in the filter array.
            bool matchValidator = (validatorAddresses.length == 0);
            if (!matchValidator) {
                // Loop through validatorAddresses to see if current validation was made by any provided validator
                for (uint256 j; j < validatorAddresses.length; ++j) {
                    if (val.validatorAddress == validatorAddresses[j]) {
                        matchValidator = true;
                        break; // Stop searching if a match is found
                    }
                }
            }

            // Tag filtering: If a zero tag is provided (no filtering), any tag matches.
            // Otherwise, only include validations whose tag matches the requested tag.
            bool matchTag = (tag == bytes32(0)) || (val.tag == tag);

            // Check if a response has been given: at least one of (response, responseHash, tag) must be non-zero
            // This distinguishes between "request with no response" and "request with response=0"
            bool hasResponse = (val.response > 0) ||
                (val.responseHash != bytes32(0)) ||
                (val.tag != bytes32(0));

            // Only count responses that matched validator and tag criteria, and have actually been responded to
            if (matchValidator && matchTag && hasResponse) {
                totalResponse += val.response; // Add the response value for averaging
                count++; // Increment the count of included responses
            }
        }

        avgResponse = count > 0 ? uint8(totalResponse / count) : 0;
    }

    function _getAgentValidations(
        uint256 agentId
    ) internal view returns (bytes32[] memory requestHashes) {
        ValidationRegistryStorage.Layout storage $ = ValidationRegistryStorage.getLayout();
        return $.requestByAgent[agentId].values();
    }

    function _getValidatorRequests(
        address validatorAddress
    ) internal view returns (bytes32[] memory requestHashes) {
        ValidationRegistryStorage.Layout storage $ = ValidationRegistryStorage.getLayout();
        return $.requestByValidator[validatorAddress].values();
    }

    /// @dev Check validation request inputs
    function _verifyValidationRequest(address validatorAddress, uint256 agentId) internal view {
        if (validatorAddress == address(0))
            ValidationRegistry__InvalidValidator.selector.revertWith();
        if (agentId == 0) ValidationRegistry__InvalidAgent.selector.revertWith();
        if (!_exists(agentId)) ValidationRegistry__AgentNotExists.selector.revertWith();

        address owner = _ownerOf(agentId);
        if (
            msg.sender != owner &&
            !_isApprovedForAll(owner, msg.sender) &&
            msg.sender != _getApproved(agentId)
        ) {
            ValidationRegistry__NotAuthorized.selector.revertWith();
        }
    }
}
