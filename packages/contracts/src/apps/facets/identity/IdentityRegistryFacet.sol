// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IIdentityRegistry} from "./IIdentityRegistry.sol";

// libraries
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {EMPTY_UID} from "@ethereum-attestation-service/eas-contracts/Common.sol";

// contracts
import {AppRegistryBase} from "../registry/AppRegistryBase.sol";
import {IdentityRegistryBase} from "./IdentityRegistryBase.sol";
import {ERC721A} from "../../../diamond/facets/token/ERC721A/ERC721A.sol";

contract IdentityRegistryFacet is
    IIdentityRegistry,
    AppRegistryBase,
    IdentityRegistryBase,
    ERC721A
{
    using CustomRevert for bytes4;

    uint256 internal constant MAX_METADATA_ENTRIES = 10;

    function __IdentityRegistryFacet_init() external onlyInitializing {
        __IdentityRegistryFacet_init_unchained();
        __ERC721A_init_unchained("Towns Bot Agent", "TBA");
    }

    /// @inheritdoc IIdentityRegistry
    function register() external returns (uint256 agentId) {
        _verifyAgent();
        agentId = _nextTokenId();
        _mint(msg.sender, 1);
        emit Registered(agentId, "", msg.sender);
    }

    /// @inheritdoc IIdentityRegistry
    function register(string calldata agentUri) external returns (uint256 agentId) {
        _verifyAgent();
        agentId = _nextTokenId();
        _mint(msg.sender, 1);
        _setAgentUri(agentId, agentUri);
        emit Registered(agentId, agentUri, msg.sender);
    }

    /// @inheritdoc IIdentityRegistry
    function register(
        string calldata agentUri,
        MetadataEntry[] calldata metadata
    ) external returns (uint256 agentId) {
        _verifyMetadataLength(metadata);
        _verifyAgent();
        agentId = _nextTokenId();
        _mint(msg.sender, 1);
        _setAgentUri(agentId, agentUri);

        for (uint256 i; i < metadata.length; ++i) {
            _setMetadata(agentId, metadata[i].metadataKey, metadata[i].metadataValue);
        }

        emit Registered(agentId, agentUri, msg.sender);
    }

    /// @inheritdoc IIdentityRegistry
    function setMetadata(
        uint256 agentId,
        string memory metadataKey,
        bytes memory metadataValue
    ) external {
        _verifyAuthorization(agentId);
        _setMetadata(agentId, metadataKey, metadataValue);
    }

    /// @inheritdoc IIdentityRegistry
    function setAgentUri(uint256 agentId, string calldata agentUri) external {
        _verifyAuthorization(agentId);
        _setAgentUri(agentId, agentUri);
        emit UriUpdated(agentId, agentUri, msg.sender);
    }

    /// @inheritdoc IIdentityRegistry
    function getMetadata(
        uint256 agentId,
        string memory metadataKey
    ) external view returns (bytes memory) {
        return _getMetadata(agentId, metadataKey);
    }

    /// @inheritdoc IIdentityRegistry
    function tokenURI(
        uint256 agentId
    ) public view override(ERC721A, IIdentityRegistry) returns (string memory) {
        if (!_exists(agentId)) revert IdentityRegistry__AgentDoesNotExist();
        return _getAgentUri(agentId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      INTERNAL FUNCTIONS                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function __IdentityRegistryFacet_init_unchained() internal {
        _addInterface(type(IIdentityRegistry).interfaceId);
    }

    function _verifyAgent() internal view {
        if (_balanceOf(msg.sender) > 0)
            IdentityRegistry__AgentAlreadyPromoted.selector.revertWith();
        if (_getLatestAppId(msg.sender) == EMPTY_UID)
            IdentityRegistry__AgentNotRegistered.selector.revertWith();
        if (_isBanned(msg.sender)) IdentityRegistry__AgentBanned.selector.revertWith();
    }

    function _verifyAuthorization(uint256 agentId) internal view {
        address owner = _ownerOf(agentId);
        if (
            msg.sender != owner &&
            !_isApprovedForAll(owner, msg.sender) &&
            msg.sender != _getApproved(agentId)
        ) {
            revert IdentityRegistry__NotAuthorized();
        }
    }

    function _startTokenId() internal pure override returns (uint256) {
        return 1;
    }

    function _verifyMetadataLength(MetadataEntry[] calldata metadata) internal pure {
        uint256 metadataLength = metadata.length;
        if (metadataLength > MAX_METADATA_ENTRIES)
            IdentityRegistry__TooManyMetadataEntries.selector.revertWith();
    }
}
