// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ExecutionManifest, IERC6900ExecutionModule, ManifestExecutionFunction, ManifestExecutionHook} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {IERC6900Module} from "@erc6900/reference-implementation/interfaces/IERC6900Module.sol";
import {IMembership} from "src/spaces/facets/membership/IMembership.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

// libraries
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {Ownable} from "solady/auth/Ownable.sol";
import {CurrencyTransfer} from "src/utils/libraries/CurrencyTransfer.sol";

// contracts
import {UUPSUpgradeable} from "solady/utils/UUPSUpgradeable.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";
import {Initializable} from "solady/utils/Initializable.sol";
import {BaseApp} from "../BaseApp.sol";

contract SubscriptionApp is BaseApp, Ownable, ReentrancyGuard, UUPSUpgradeable, Initializable {
    using EnumerableSetLib for EnumerableSetLib.AddressSet;

    // keccak256(abi.encode(uint256(keccak256("towns.subscription.app.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x1730a516d0eb90c4b30f6a08eb96446983a0ddd992d91766191d8af201022d00;

    /// @custom:storage-location erc7201:towns.subscription.app.storage
    struct Layout {
        uint256 feeBps;
        mapping(address town => mapping(uint256 tokenId => bool subscribed)) subscriptions;
        mapping(address town => EnumerableSetLib.AddressSet subscribers) subscribers;
        mapping(address subscriber => uint256 prepaidBalance) prepaidBalance;
    }

    function getLayout() internal pure returns (Layout storage db) {
        assembly {
            db.slot := STORAGE_SLOT
        }
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    error NotOwner();
    error AlreadySubscribed();
    error InsufficientPrepaidBalance(uint256 required, uint256 balance);
    error InsufficientBalance();
    error NotSubscribed();
    error InvalidFeePercentage();

    event Subscribed(address indexed town, uint256 indexed tokenId, address indexed subscriber);
    event Unsubscribed(address indexed town, uint256 indexed tokenId, address indexed subscriber);
    event Renewed(address indexed town, uint256 indexed tokenId, address indexed subscriber);
    event Deposited(address indexed subscriber, uint256 amount);
    event Withdrawn(address indexed subscriber, uint256 amount);
    event FeePercentageUpdated(uint256 feeBps);

    function setFeePercentage(uint256 _feeBps) external onlyOwner {
        if (_feeBps > 1000) revert InvalidFeePercentage();
        getLayout().feeBps = _feeBps;
        emit FeePercentageUpdated(_feeBps);
    }

    function getFeeBps() external view returns (uint256) {
        return getLayout().feeBps;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Init                             */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    constructor() {
        _disableInitializers();
    }

    function __SubscriptionApp_init(address owner, uint256 feeBps) external initializer {
        _initializeOwner(owner);
        getLayout().feeBps = feeBps;
    }

    function deposit() external payable {
        Layout storage db = getLayout();
        db.prepaidBalance[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        Layout storage db = getLayout();
        if (db.prepaidBalance[msg.sender] < amount) revert InsufficientBalance();

        db.prepaidBalance[msg.sender] -= amount;
        CurrencyTransfer.transferCurrency(
            CurrencyTransfer.NATIVE_TOKEN,
            address(this),
            msg.sender,
            amount
        );

        emit Withdrawn(msg.sender, amount);
    }

    function subscribe(address town, uint256 tokenId) external {
        Layout storage db = getLayout();

        IERC721 token = IERC721(town);
        if (token.ownerOf(tokenId) != msg.sender) revert NotOwner();

        if (_isSubscribed(town, tokenId)) revert AlreadySubscribed();

        db.subscriptions[town][tokenId] = true;
        db.subscribers[town].add(msg.sender);

        emit Subscribed(town, tokenId, msg.sender);
    }

    function unsubscribe(address town, uint256 tokenId) external {
        Layout storage db = getLayout();

        IERC721 token = IERC721(town);
        if (token.ownerOf(tokenId) != msg.sender) revert NotOwner();

        if (!_isSubscribed(town, tokenId)) revert NotSubscribed();

        db.subscriptions[town][tokenId] = false;
        db.subscribers[town].remove(msg.sender);

        emit Unsubscribed(town, tokenId, msg.sender);
    }

    function renew(address town, uint256 tokenId, address subscriber) external nonReentrant {
        Layout storage db = getLayout();

        if (!db.subscribers[town].contains(subscriber)) revert NotSubscribed();

        IMembership membership = IMembership(town);
        uint256 basePrice = membership.getMembershipRenewalPrice(tokenId);

        // Calculate fee first
        uint256 fee = (basePrice * db.feeBps + 9999) / 10000;
        uint256 totalRequired = basePrice + fee;
        uint256 balance = db.prepaidBalance[subscriber];

        // Check if user has enough to cover both the renewal price and fee
        if (balance < totalRequired) revert InsufficientPrepaidBalance(totalRequired, balance);

        // Deduct total amount from prepaid balance
        db.prepaidBalance[subscriber] -= totalRequired;

        // Transfer fee to owner
        CurrencyTransfer.transferCurrency(
            CurrencyTransfer.NATIVE_TOKEN,
            address(this),
            owner(),
            fee
        );

        // Renew with the base price
        membership.renewMembership{value: basePrice}(tokenId);

        emit Renewed(town, tokenId, subscriber);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        Requirements                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function moduleId() external pure returns (string memory) {
        return "towns.subscription.app";
    }

    function requiredPermissions() external pure returns (bytes32[] memory) {
        bytes32[] memory permissions = new bytes32[](2);
        permissions[0] = keccak256("Read");
        permissions[1] = keccak256("Write");
        return permissions;
    }

    function executionManifest() external pure returns (ExecutionManifest memory) {
        ExecutionManifest memory manifest;

        manifest.executionFunctions = new ManifestExecutionFunction[](1);
        manifest.executionFunctions[0] = ManifestExecutionFunction({
            executionSelector: this.subscribe.selector,
            skipRuntimeValidation: false,
            allowGlobalValidation: true
        });
        manifest.executionHooks = new ManifestExecutionHook[](0);
        manifest.interfaceIds = new bytes4[](0);

        return manifest;
    }

    receive() external payable {}

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Internal                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _isSubscribed(address town, uint256 tokenId) internal view returns (bool) {
        Layout storage db = getLayout();
        return db.subscriptions[town][tokenId];
    }

    uint256[50] private __gap;
}
