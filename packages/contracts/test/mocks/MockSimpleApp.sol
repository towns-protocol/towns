// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {ExecutionManifest, ManifestExecutionFunction, ManifestExecutionHook} from "@erc6900/reference-implementation/interfaces/IExecutionModule.sol";
import {IAppTreasury} from "src/spaces/facets/account/treasury/IAppTreasury.sol";

// contracts
import {BaseApp} from "src/apps/BaseApp.sol";

contract MockSimpleApp is BaseApp {
    // keccak256(abi.encode(uint256(keccak256("mock.simple.app.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant MOCK_STORAGE_SLOT =
        0x736fb6c69da8837a812897254acbb0c320fd7b33db95d04b065743ec92adf000;

    event VoucherRequested(bytes32 indexed voucherId, address indexed token, uint256 amount);
    event FundsReceived(address indexed sender, address indexed token, uint256 amount);

    struct Layout {
        address owner;
        mapping(address => bytes32) voucherIds;
    }

    function getLayout() internal pure returns (Layout storage $) {
        assembly {
            $.slot := MOCK_STORAGE_SLOT
        }
    }

    function initialize(bytes calldata data) external {
        (address owner, , , , ) = abi.decode(data, (address, string, bytes32[], uint256, uint48));
        getLayout().owner = owner;
    }

    function moduleId() external pure returns (string memory) {
        return "mock.simple.app";
    }

    function requiredPermissions() external pure returns (bytes32[] memory) {
        bytes32[] memory permissions = new bytes32[](1);
        permissions[0] = bytes32("Read");
        return permissions;
    }

    function requestFunds(address token, uint256 amount) external payable {
        IAppTreasury treasury = IAppTreasury(msg.sender);
        bytes32 voucherId = treasury.fundsRequest(token, amount);
        if (voucherId != bytes32(0)) {
            getLayout().voucherIds[msg.sender] = voucherId;
            emit VoucherRequested(voucherId, token, amount);
        } else {
            emit FundsReceived(msg.sender, token, amount);
        }
    }

    function executionManifest() external pure override returns (ExecutionManifest memory) {
        ManifestExecutionFunction[] memory executionFunctions = new ManifestExecutionFunction[](1);
        ManifestExecutionHook[] memory executionHooks = new ManifestExecutionHook[](0);

        executionFunctions[0] = ManifestExecutionFunction({
            executionSelector: this.requestFunds.selector,
            skipRuntimeValidation: false,
            allowGlobalValidation: true
        });

        bytes4[] memory interfaceIds;

        return
            ExecutionManifest({
                executionFunctions: executionFunctions,
                executionHooks: executionHooks,
                interfaceIds: interfaceIds
            });
    }

    function _moduleOwner() internal view override returns (address) {
        return getLayout().owner;
    }
}
