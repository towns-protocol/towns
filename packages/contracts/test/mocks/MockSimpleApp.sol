// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {ExecutionManifest, ManifestExecutionFunction, ManifestExecutionHook} from "@erc6900/reference-implementation/interfaces/IExecutionModule.sol";
import {IAppTreasury} from "src/spaces/facets/account/treasury/IAppTreasury.sol";

// contracts
import {SimpleApp} from "src/apps/helpers/SimpleApp.sol";

contract MockSimpleApp is SimpleApp {
    // keccak256(abi.encode(uint256(keccak256("mock.simple.app.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x736fb6c69da8837a812897254acbb0c320fd7b33db95d04b065743ec92adf000;

    event VoucherRequested(bytes32 indexed voucherId, address indexed token, uint256 amount);
    event FundsReceived(address indexed sender, address indexed token, uint256 amount);

    struct Layout {
        mapping(address => bytes32) voucherIds;
    }

    function store() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }

    function swap(address token) external payable {
        IAppTreasury treasury = IAppTreasury(msg.sender);
        bytes32 voucherId = treasury.requestFunds(token, 1 ether);
        if (voucherId != bytes32(0)) {
            store().voucherIds[msg.sender] = voucherId;
            emit VoucherRequested(voucherId, token, 1 ether);
        } else {
            emit FundsReceived(msg.sender, token, 1 ether);
        }
    }

    function executionManifest() external pure override returns (ExecutionManifest memory) {
        ManifestExecutionFunction[] memory executionFunctions = new ManifestExecutionFunction[](1);
        ManifestExecutionHook[] memory executionHooks = new ManifestExecutionHook[](0);

        executionFunctions[0] = ManifestExecutionFunction({
            executionSelector: this.swap.selector,
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
}
