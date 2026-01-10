// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IFeeHook, FeeHookResult} from "../../factory/facets/fee/IFeeHook.sol";

// libraries
import {CustomRevert} from "../../utils/libraries/CustomRevert.sol";

// contracts
import {Ownable} from "solady/auth/Ownable.sol";

/// @title DomainFeeHook
/// @notice Fee hook for domain registration with tiered pricing and first-free logic
/// @dev Implements IFeeHook to integrate with FeeManager system
contract DomainFeeHook is IFeeHook, Ownable {
    using CustomRevert for bytes4;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          STORAGE                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    struct Layout {
        uint256 defaultPrice;
        mapping(uint256 length => uint256 price) priceTiers;
        mapping(address account => uint256 count) registrationCount;
        address feeManager;
    }

    /// keccak256(abi.encode(uint256(keccak256("towns.domains.registrar.domain.feehook.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x54805b38b00d627862a1394d5554c4c16c8fd44fa1e31b86f37dcbff65fe4e00;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          EVENTS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Emitted when the default price is updated
    event DefaultPriceSet(uint256 price);

    /// @notice Emitted when a price tier is set
    event PriceTierSet(uint256 indexed length, uint256 price);

    /// @notice Emitted when the fee manager is updated
    event FeeManagerSet(address indexed feeManager);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          ERRORS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Thrown when context data is invalid or missing
    error DomainFeeHook__InvalidContext();

    /// @notice Thrown when array lengths don't match in batch operations
    error DomainFeeHook__LengthMismatch();

    /// @notice Thrown when caller is not the authorized FeeManager
    error DomainFeeHook__Unauthorized();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        CONSTRUCTOR                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Initializes the fee hook with an owner and default price
    /// @param owner The owner address
    /// @param defaultPrice The default price for registrations
    constructor(address owner, address feeManager, uint256 defaultPrice) {
        _initializeOwner(owner);
        Layout storage $ = getStorage();
        ($.feeManager, $.defaultPrice) = (feeManager, defaultPrice);
        emit FeeManagerSet(feeManager);
        emit DefaultPriceSet(defaultPrice);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       FEE HOOK                             */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IFeeHook
    function onChargeFee(
        bytes32,
        address user,
        uint256,
        bytes calldata context
    ) external returns (FeeHookResult memory result) {
        Layout storage $ = getStorage();
        // Restrict to authorized FeeManager only
        if (msg.sender != $.feeManager) DomainFeeHook__Unauthorized.selector.revertWith();

        result = _calculateFee(user, context);
        // Increment registration count (state change)
        ++$.registrationCount[user];
    }

    /// @notice Sets the fee manager address
    /// @param feeManager_ The fee manager address authorized to call onChargeFee
    function setFeeManager(address feeManager_) external onlyOwner {
        getStorage().feeManager = feeManager_;
        emit FeeManagerSet(feeManager_);
    }

    /// @notice Sets the default price for registrations
    /// @param price The new default price
    function setDefaultPrice(uint256 price) external onlyOwner {
        getStorage().defaultPrice = price;
        emit DefaultPriceSet(price);
    }

    /// @notice Sets the price for a specific label length
    /// @param length The label length
    /// @param price The price for that length
    function setPriceTier(uint256 length, uint256 price) external onlyOwner {
        getStorage().priceTiers[length] = price;
        emit PriceTierSet(length, price);
    }

    /// @notice Sets multiple price tiers at once
    /// @param lengths Array of label lengths
    /// @param prices Array of prices corresponding to each length
    function setPriceTiers(
        uint256[] calldata lengths,
        uint256[] calldata prices
    ) external onlyOwner {
        if (lengths.length != prices.length) DomainFeeHook__LengthMismatch.selector.revertWith();

        Layout storage $ = getStorage();
        for (uint256 i; i < lengths.length; ++i) {
            $.priceTiers[lengths[i]] = prices[i];
            emit PriceTierSet(lengths[i], prices[i]);
        }
    }

    /// @inheritdoc IFeeHook
    function calculateFee(
        bytes32,
        address user,
        uint256,
        bytes calldata context
    ) external view returns (FeeHookResult memory) {
        return _calculateFee(user, context);
    }

    /// @notice Returns the price for a specific label length
    /// @param length The label length to query
    /// @return The price for that length (or default if not set)
    function getPrice(uint256 length) external view returns (uint256) {
        Layout storage $ = getStorage();
        uint256 price = $.priceTiers[length];
        return price == 0 ? $.defaultPrice : price;
    }

    /// @notice Returns the default price for registrations
    /// @return The default price
    function getDefaultPrice() external view returns (uint256) {
        return getStorage().defaultPrice;
    }

    /// @notice Returns the registration count for a user
    /// @param user The user to query
    /// @return The registration count
    function getRegistrationCount(address user) external view returns (uint256) {
        return getStorage().registrationCount[user];
    }

    /// @notice Returns the authorized fee manager address
    /// @return The fee manager address
    function getFeeManager() external view returns (address) {
        return getStorage().feeManager;
    }

    /// @notice Internal fee calculation logic
    /// @param user The user being charged
    /// @param context ABI-encoded label length
    /// @return result The fee calculation result
    function _calculateFee(
        address user,
        bytes calldata context
    ) internal view returns (FeeHookResult memory) {
        Layout storage $ = getStorage();
        // First registration is free
        if ($.registrationCount[user] == 0) {
            return FeeHookResult({finalFee: 0, metadata: ""});
        }

        // Decode label length from context
        if (context.length < 32) DomainFeeHook__InvalidContext.selector.revertWith();
        uint256 labelLength = abi.decode(context, (uint256));

        // Get tiered price (fall back to default)
        uint256 price = $.priceTiers[labelLength];
        if (price == 0) price = $.defaultPrice;

        return FeeHookResult({finalFee: price, metadata: ""});
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
