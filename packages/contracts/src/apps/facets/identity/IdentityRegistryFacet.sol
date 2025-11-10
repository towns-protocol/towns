// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IIdentityRegistry} from "./IIdentityRegistry.sol";

// libraries
import {AppRegistryStorage} from "../registry/AppRegistryStorage.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";

// contracts
import {IdentityRegistryBase} from "./IdentityRegistryBase.sol";
import {ERC721ABase} from "../../../diamond/facets/token/ERC721A/ERC721ABase.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

contract IdentityRegistryFacet is IIdentityRegistry, IdentityRegistryBase, ERC721ABase, Facet {
    using CustomRevert for bytes4;

    function __IdentityRegistryFacet_init() external onlyInitializing {
        _addInterface(type(IIdentityRegistry).interfaceId);
        __ERC721ABase_init("AgentIdentity", "AID");
    }

    /// @inheritdoc IIdentityRegistry
    function register() external returns (uint256 agentId) {
        _verifyAgent();
        agentId = _nextTokenId();
        _mint(msg.sender, 1);
        emit Registered(agentId, "", msg.sender);
    }

    /// @inheritdoc IIdentityRegistry
    function register(string calldata tokenUri) external returns (uint256 agentId) {
        _verifyAgent();
        agentId = _nextTokenId();
        _mint(msg.sender, 1);
        _setTokenUri(agentId, tokenUri);
        emit Registered(agentId, tokenUri, msg.sender);
    }

    /// @inheritdoc IIdentityRegistry
    function register(
        string calldata tokenUri,
        MetadataEntry[] calldata metadata
    ) external returns (uint256 agentId) {
        _verifyAgent();
        agentId = _nextTokenId();
        _mint(msg.sender, 1);
        _setTokenUri(agentId, tokenUri);
        emit Registered(agentId, tokenUri, msg.sender);

        for (uint256 i; i < metadata.length; ++i) {
            _setMetadata(agentId, metadata[i].key, metadata[i].value);
        }
    }

    /// @inheritdoc IIdentityRegistry
    function getMetadata(uint256 agentId, string memory key) external view returns (bytes memory) {
        return _getMetadata(agentId, key);
    }

    /// @inheritdoc IIdentityRegistry
    function setMetadata(uint256 agentId, string memory key, bytes memory value) external {
        _verifyAuthorization(agentId);
        _setMetadata(agentId, key, value);
    }

    /// @inheritdoc IIdentityRegistry
    function setAgentUri(uint256 agentId, string calldata newUri) external {
        _verifyAuthorization(agentId);
        _setTokenUri(agentId, newUri);
        emit UriUpdated(agentId, newUri, msg.sender);
    }

    /// @inheritdoc IIdentityRegistry
    function tokenURI(uint256 tokenId) public view returns (string memory) {
        if (!_exists(tokenId)) revert IdentityRegistry__TokenDoesNotExist();
        return _getTokenUri(tokenId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      INTERNAL FUNCTIONS                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Verifies that the caller has a stake in the app
    function _verifyStake() internal view {
        // TODO: Implement stake verification
    }

    function _verifyAgent() internal view {
        if (_balanceOf(msg.sender) > 0)
            IdentityRegistry__AgentAlreadyPublished.selector.revertWith();

        AppRegistryStorage.Layout storage $ = AppRegistryStorage.getLayout();
        if ($.apps[msg.sender].app == address(0))
            IdentityRegistry__AgentNotRegistered.selector.revertWith();
        if ($.apps[msg.sender].isBanned) IdentityRegistry__AgentBanned.selector.revertWith();
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
}
