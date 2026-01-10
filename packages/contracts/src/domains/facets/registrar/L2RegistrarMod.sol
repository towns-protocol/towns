// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IL2Registry} from "../l2/IL2Registry.sol";
import {IModularAccount} from "@erc6900/reference-implementation/interfaces/IModularAccount.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IFeeManager} from "../../../factory/facets/fee/IFeeManager.sol";

// libraries
import {LibString} from "solady/utils/LibString.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {FeeTypesLib} from "../../../factory/facets/fee/FeeTypesLib.sol";
import {ProtocolFeeLib} from "../../../spaces/facets/ProtocolFeeLib.sol";

// contracts
import {AddrResolverFacet} from "../l2/AddrResolverFacet.sol";

library L2RegistrarMod {
    using CustomRevert for bytes4;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          LAYOUT                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    struct Layout {
        address registry;
        uint256 coinType;
        address spaceFactory;
        address currency;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         CONSTANTS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Minimum length required for a subdomain label (3 characters)
    uint256 internal constant MIN_LABEL_LENGTH = 3;

    /// @notice Maximum length allowed for a subdomain label (63 characters per DNS spec)
    uint256 internal constant MAX_LABEL_LENGTH = 63;

    /// @notice Allowed characters: lowercase a-z, digits 0-9, and hyphen
    /// @dev Computed as: LOWERCASE_7_BIT_ASCII | DIGITS_7_BIT_ASCII | (1 << 45)
    /// where 45 is the ASCII code for hyphen '-'
    uint128 internal constant ALLOWED_LABEL_CHARS =
        LibString.LOWERCASE_7_BIT_ASCII | LibString.DIGITS_7_BIT_ASCII | 0x200000000000;

    /// @notice ASCII code for hyphen character
    bytes1 internal constant HYPHEN = 0x2d;

    /// keccak256(abi.encode(uint256(keccak256("towns.domains.registrar.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xd8d4140311c6e36bf92b2f6d963b373d4b20ef4c79fad106c706a4d652ed9b00;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Emitted when a new subdomain is registered
    /// @param label The subdomain label
    /// @param owner The owner of the subdomain
    event NameRegistered(string indexed label, address indexed owner);

    /// @notice Emitted when the space factory address is updated
    /// @param spaceFactory The new space factory address
    event SpaceFactorySet(address spaceFactory);

    /// @notice Emitted when the registry address is updated
    /// @param registry The new registry address
    event RegistrySet(address registry);

    /// @notice Emitted when the currency is updated
    /// @param currency The new currency
    event CurrencySet(address currency);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Thrown when a label is invalid (wrong length, chars, or format)
    error L2Registrar__InvalidLabel();

    /// @notice Thrown when caller is not a Towns smart account (IModularAccount)
    error L2Registrar__NotSmartAccount();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         FUNCTIONS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Registers a subdomain in the L2 registry
    /// @dev Reverts if the subdomain is not available or the label is invalid
    /// @param $ The storage layout
    /// @param subdomain The subdomain label to register (e.g., "alice")
    /// @param owner The address of the owner of the subdomain
    function register(Layout storage $, string calldata subdomain, address owner) internal {
        // Get registry interface to interact with domain management functions
        IL2Registry registry = IL2Registry($.registry);

        // Retrieve the base domain hash (e.g., namehash("towns.eth"))
        bytes32 domainHash = registry.baseDomainHash();

        // Compute the subdomain namehash (e.g., namehash("alice.towns.eth"))
        bytes32 subdomainHash = registry.encodeSubdomain(domainHash, subdomain);

        // Register the name in the L2 registry
        registry.createSubdomain(domainHash, subdomain, owner, new bytes[](0), "");

        // Encode owner address as bytes for resolver record storage
        bytes memory addr = abi.encodePacked(owner);

        // Get address resolver facet to set address records for the subdomain
        AddrResolverFacet addrResolver = AddrResolverFacet($.registry);

        // Set the forward address for the current chain. This is needed for reverse resolution.
        // E.g. if this contract is deployed to Base, set an address for chainId 8453 which is
        // coinType 2147492101 according to ENSIP-11.
        addrResolver.setAddr(subdomainHash, $.coinType, addr);

        // Set the forward address for mainnet ETH (coinType 60) for easier debugging.
        addrResolver.setAddr(subdomainHash, 60, addr);

        // Emit event to notify about the successful registration
        emit NameRegistered(subdomain, owner);
    }

    function chargeFee(Layout storage $, string calldata label) internal {
        if ($.spaceFactory == address(0)) return;
        if ($.currency == address(0)) return;

        bytes memory extraData = abi.encode(bytes(label).length);

        uint256 expectedFee = IFeeManager($.spaceFactory).calculateFee(
            FeeTypesLib.DOMAIN_REGISTRATION,
            msg.sender,
            0,
            extraData
        );

        ProtocolFeeLib.chargeAlways(
            $.spaceFactory,
            FeeTypesLib.DOMAIN_REGISTRATION,
            msg.sender,
            $.currency,
            expectedFee,
            expectedFee,
            extraData
        );
    }

    /// @notice Validates caller is a Towns smart account (IModularAccount)
    /// @dev Uses ERC-165 supportsInterface check
    function onlySmartAccount() internal view {
        // Must be a contract
        if (msg.sender.code.length == 0) {
            L2Registrar__NotSmartAccount.selector.revertWith();
        }

        // Must support IModularAccount interface
        try IERC165(msg.sender).supportsInterface(type(IModularAccount).interfaceId) returns (
            bool supported
        ) {
            if (!supported) L2Registrar__NotSmartAccount.selector.revertWith();
        } catch {
            L2Registrar__NotSmartAccount.selector.revertWith();
        }
    }

    /// @notice Checks if a subdomain is available for registration
    /// @dev Returns true if the label is valid and the subdomain doesn't exist
    /// @param $ The storage layout
    /// @param subdomain The subdomain label to check (e.g., "alice")
    /// @return True if the subdomain is available, false otherwise
    function available(Layout storage $, string calldata subdomain) internal view returns (bool) {
        // Check label validity first
        if (!isValidLabel(subdomain)) return false;

        // Check if subdomain already exists by querying its owner
        // subdomainOwner returns address(0) if the subdomain doesn't exist
        IL2Registry registry = IL2Registry($.registry);

        // Compute the subdomain namehash
        bytes32 subdomainHash = registry.encodeSubdomain(registry.baseDomainHash(), subdomain);

        // Available if owner is zero address (subdomain doesn't exist)
        return registry.subdomainOwner(subdomainHash) == address(0);
    }

    /// @notice Validates a subdomain label for registration
    /// @dev Checks: length (3-63), allowed chars (a-z, 0-9, hyphen), no leading/trailing hyphen
    /// @param label The subdomain label to validate (e.g., "alice")
    function validateLabel(string calldata label) internal pure {
        if (!isValidLabel(label)) L2Registrar__InvalidLabel.selector.revertWith();
    }

    /// @notice Checks if a label is valid without checking availability
    /// @dev Use this for UI validation before attempting registration
    /// @param label The subdomain label to validate
    /// @return True if the label format is valid
    function isValidLabel(string calldata label) internal pure returns (bool) {
        uint256 len = bytes(label).length;

        // Check length bounds
        if (len < MIN_LABEL_LENGTH || len > MAX_LABEL_LENGTH) return false;

        // Check all characters are allowed (a-z, 0-9, hyphen)
        if (!LibString.is7BitASCII(label, ALLOWED_LABEL_CHARS)) return false;

        // Check hyphen not at start or end
        bytes calldata b = bytes(label);
        if (b[0] == HYPHEN || b[len - 1] == HYPHEN) return false;

        return true;
    }

    /// @notice Returns the storage layout for the L2Registrar facet
    /// @dev Uses diamond storage pattern to avoid slot collisions between facets
    /// @return $ The storage pointer to the facet's layout
    function getStorage() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }
}
