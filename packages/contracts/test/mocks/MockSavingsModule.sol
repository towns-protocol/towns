// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ExecutionManifest, IExecutionModule, ManifestExecutionFunction, ManifestExecutionHook} from "@erc6900/reference-implementation/interfaces/IExecutionModule.sol";
import {IModule} from "@erc6900/reference-implementation/interfaces/IModule.sol";
import {ITownsApp} from "src/apps/ITownsApp.sol";
import {IERC173} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";

// contracts
import {OwnableFacet} from "@towns-protocol/diamond/src/facets/ownable/OwnableFacet.sol";

/**
 * @title SavingsModule
 * @notice A module that manages savings for a ModularAccount space
 * @dev Implements ERC6900 module interface for integration with ModularAccount
 */
contract MockSavingsModule is OwnableFacet, ITownsApp {
    // Events
    event Deposited(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);
    event InterestAccrued(address indexed account, uint256 amount);
    event HookFunctionCalled(address indexed account, uint256 amount);

    // State variables
    mapping(address => uint256) public balances;
    mapping(address => uint256) public lastDepositTime;

    // Constants
    uint256 public constant INTEREST_RATE = 500; // 5% annual rate (in basis points)
    uint256 public constant BASIS_POINTS = 10000;

    constructor() {
        __Ownable_init_unchained(msg.sender);
    }

    function initialize(bytes calldata data) external override initializer {}

    function moduleId() external pure returns (string memory) {
        return "towns.savings.account.module";
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == type(IExecutionModule).interfaceId ||
            interfaceId == type(IModule).interfaceId ||
            interfaceId == type(ITownsApp).interfaceId ||
            interfaceId == type(IERC173).interfaceId;
    }

    /// @inheritdoc ITownsApp
    function moduleOwner() external view returns (address) {
        return _owner();
    }

    /// @inheritdoc ITownsApp
    function requiredPermissions() external pure returns (bytes32[] memory) {
        bytes32[] memory permissions = new bytes32[](2);
        permissions[0] = keccak256("Read");
        permissions[1] = keccak256("Write");
        return permissions;
    }

    /// @inheritdoc ITownsApp
    function installPrice() external pure returns (uint256) {
        return 0;
    }

    /// @inheritdoc ITownsApp
    function accessDuration() external pure returns (uint48) {
        return 0;
    }

    /**
     * @notice Returns the manifest of functions this module provides
     * @return manifest The manifest of functions this module provides
     */
    function executionManifest() external pure returns (ExecutionManifest memory) {
        ManifestExecutionFunction[] memory functions = new ManifestExecutionFunction[](2);
        ManifestExecutionHook[] memory hooks = new ManifestExecutionHook[](1);

        // Deposit function
        functions[0] = ManifestExecutionFunction({
            executionSelector: this.deposit.selector,
            skipRuntimeValidation: false,
            allowGlobalValidation: true
        });

        // Withdraw function
        functions[1] = ManifestExecutionFunction({
            executionSelector: this.withdraw.selector,
            skipRuntimeValidation: false,
            allowGlobalValidation: true
        });

        // Hook function to call after deposit
        // the hook is called before and after the deposit function
        hooks[0] = ManifestExecutionHook({
            executionSelector: this.deposit.selector,
            entityId: 0,
            isPreHook: true,
            isPostHook: true
        });

        return
            ExecutionManifest({
                executionFunctions: functions,
                executionHooks: hooks,
                interfaceIds: new bytes4[](0)
            });
    }

    function preExecutionHook(
        uint32,
        address,
        uint256,
        bytes calldata
    ) external payable returns (bytes memory) {
        emit HookFunctionCalled(msg.sender, msg.value);
        return "";
    }

    function postExecutionHook(uint32, bytes calldata) external payable returns (bytes memory) {
        emit HookFunctionCalled(msg.sender, msg.value);
        return "";
    }

    /**
     * @notice Deposits ETH into savings
     * @dev Called through ModularAccount.execute()
     */
    function deposit() external payable {
        require(msg.value > 0, "Must deposit some ETH");

        // Accrue any pending interest before new deposit
        _accrueInterest();

        // Update balance and deposit time
        balances[msg.sender] += msg.value;
        lastDepositTime[msg.sender] = block.timestamp;

        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @notice Withdraws ETH from savings
     * @param amount The amount to withdraw
     * @dev Called through ModularAccount.execute()
     */
    function withdraw(uint256 amount) external {
        require(amount > 0, "Must withdraw some ETH");

        // Accrue interest before withdrawal
        _accrueInterest();

        require(balances[msg.sender] >= amount, "Insufficient balance");

        // Update balance
        balances[msg.sender] -= amount;

        // Transfer ETH back to the ModularAccount
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "ETH transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Returns the current balance including accrued interest
     * @param account The account to check
     */
    function getCurrentBalance(address account) external view returns (uint256) {
        if (balances[account] == 0) return 0;

        // Calculate time elapsed since last deposit
        uint256 timeElapsed = block.timestamp - lastDepositTime[account];

        // Calculate interest (simplified annual interest)
        uint256 interest = (balances[account] * INTEREST_RATE * timeElapsed) /
            (BASIS_POINTS * 365 days);

        return balances[account] + interest;
    }

    /**
     * @notice Internal function to accrue interest
     */
    function _accrueInterest() internal {
        if (balances[msg.sender] == 0) return;

        uint256 timeElapsed = block.timestamp - lastDepositTime[msg.sender];

        // Calculate and add interest
        uint256 interest = (balances[msg.sender] * INTEREST_RATE * timeElapsed) /
            (BASIS_POINTS * 365 days);
        if (interest > 0) {
            balances[msg.sender] += interest;
            emit InterestAccrued(msg.sender, interest);
        }

        lastDepositTime[msg.sender] = block.timestamp;
    }

    /**
     * @notice Required by IModule - called when module is installed
     */
    function onInstall(bytes calldata) external pure {
        // No initialization needed
    }

    /**
     * @notice Required by IModule - called when module is uninstalled
     */
    function onUninstall(bytes calldata) external view {
        // Ensure all funds are withdrawn before uninstall
        require(balances[msg.sender] == 0, "Must withdraw all funds before uninstall");
    }

    /**
     * @notice Required for contract to receive ETH
     */
    receive() external payable {}
}
