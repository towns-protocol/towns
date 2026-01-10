// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IValidationRegistry} from "./IValidationRegistry.sol";

// libraries
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {ValidationStatus} from "./ValidationRegistryStorage.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {ValidationRegistryBase} from "./ValidationRegistryBase.sol";

contract ValidationRegistryFacet is IValidationRegistry, Facet, ValidationRegistryBase {
    using CustomRevert for bytes4;

    function __ValidationRegistryFacet_init() external onlyInitializing {
        __ValidationRegistryFacet_init_unchained();
    }

    /// @inheritdoc IValidationRegistry
    function validationRequest(
        address validatorAddress,
        uint256 agentId,
        string calldata requestUri,
        bytes32 requestHash
    ) external {
        _verifyValidationRequest(validatorAddress, agentId);
        _requestValidation(validatorAddress, agentId, requestUri, requestHash);
    }

    /// @inheritdoc IValidationRegistry
    function validationResponse(
        bytes32 requestHash,
        uint8 response,
        string calldata responseUri,
        bytes32 responseHash,
        bytes32 tag
    ) external {
        _responseValidation(requestHash, response, responseUri, responseHash, tag);
    }

    /// @inheritdoc IValidationRegistry
    function getValidationStatus(
        bytes32 requestHash
    )
        external
        view
        returns (
            address validatorAddress,
            uint256 agentId,
            uint8 response,
            bytes32 tag,
            uint256 lastUpdate
        )
    {
        ValidationStatus memory val = _getValidationStatus(requestHash);
        return (val.validatorAddress, val.agentId, val.response, val.tag, val.lastUpdate);
    }

    /// @inheritdoc IValidationRegistry
    function getSummary(
        uint256 agentId,
        address[] calldata validatorAddresses,
        bytes32 tag
    ) external view returns (uint64 count, uint8 avgResponse) {
        return _getSummary(agentId, validatorAddresses, tag);
    }

    /// @inheritdoc IValidationRegistry
    function getAgentValidations(
        uint256 agentId
    ) external view returns (bytes32[] memory requestHashes) {
        return _getAgentValidations(agentId);
    }

    /// @inheritdoc IValidationRegistry
    function getValidatorRequests(
        address validatorAddress
    ) external view returns (bytes32[] memory requestHashes) {
        return _getValidatorRequests(validatorAddress);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      INTERNAL FUNCTIONS                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function __ValidationRegistryFacet_init_unchained() internal {
        _addInterface(type(IValidationRegistry).interfaceId);
    }
}
