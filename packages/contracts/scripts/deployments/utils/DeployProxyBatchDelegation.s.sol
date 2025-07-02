// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {Deployer} from "../../common/Deployer.s.sol";
import {ProxyBatchDelegation} from "src/tokens/mainnet/delegation/ProxyBatchDelegation.sol";
import {MockMessenger} from "test/mocks/MockMessenger.sol";

// deployments
import {DeployTownsMainnet} from "./DeployTownsMainnet.s.sol";

contract DeployProxyBatchDelegation is Deployer {
    address internal constant CLAIMERS = 0x0bEe55b52d01C4D5d4D0cfcE1d6e0baE6722db05;
    address internal constant BASE_REGISTRY = 0x7c0422b31401C936172C897802CF0373B35B7698;
    address internal constant BASE_REGISTRY_SEPOLIA = 0x08cC41b782F27d62995056a4EF2fCBAe0d3c266F;
    address internal constant MESSENGER = 0x866E82a600A1414e583f7F13623F1aC5d58b0Afa;
    address internal constant MESSENGER_SEPOLIA = 0xC34855F4De64F1840e5686e64278da901e261f20;

    // Mainnet
    DeployTownsMainnet internal townsHelper = new DeployTownsMainnet();

    address public townsToken;
    address public claimers;
    address public mainnetDelegation;
    address public messenger;
    address public vault;

    function versionName() public pure override returns (string memory) {
        return "utils/proxyBatchDelegation";
    }

    function setDependencies(address mainnetDelegation_, address messenger_) external {
        mainnetDelegation = mainnetDelegation_;
        messenger = messenger_;
    }

    function __deploy(address deployer) internal override returns (address) {
        townsToken = townsHelper.deploy(deployer);
        debug("DeployProxyBatchDelegation: townsToken: %s", townsToken);

        vault = townsHelper.vault();

        claimers = _getClaimers(deployer);
        debug("DeployProxyBatchDelegation: claimers: %s", claimers);

        if (messenger == address(0)) {
            if (isAnvil() || isTesting()) {
                vm.broadcast(deployer);
                messenger = address(new MockMessenger());
            } else {
                messenger = getMessenger();
            }
        }
        debug("DeployProxyBatchDelegation: messenger: %s", messenger);

        if (mainnetDelegation == address(0)) {
            mainnetDelegation = _getMainnetDelegation();
        }

        if (townsToken == address(0)) {
            revert("DeployProxyBatchDelegation: Towns token not deployed");
        }

        if (claimers == address(0)) {
            revert("DeployProxyBatchDelegation: Claimers not deployed");
        }

        vm.broadcast(deployer);
        return
            address(new ProxyBatchDelegation(townsToken, claimers, messenger, mainnetDelegation));
    }

    function _getClaimers(address deployer) internal returns (address) {
        if (block.chainid == 1) {
            return CLAIMERS;
        }

        vm.broadcast(deployer);
        return deployCode("AuthorizedClaimers", "");
    }

    function _getMainnetDelegation() internal returns (address) {
        if (block.chainid == 84_532 || block.chainid == 11_155_111) {
            // base registry on base sepolia
            return BASE_REGISTRY_SEPOLIA;
        }

        if (block.chainid == 1) {
            // Base Registry contract on Base
            return BASE_REGISTRY;
        }

        return getDeployment("baseRegistry");
    }

    function getMessenger() public view returns (address) {
        // Base or Base (Sepolia)
        if (block.chainid == 8453 || block.chainid == 84_532) {
            return 0x4200000000000000000000000000000000000007;
        } else if (block.chainid == 1) {
            return MESSENGER;
        } else if (block.chainid == 11_155_111) {
            return MESSENGER_SEPOLIA;
        } else {
            revert("DeployProxyDelegation: Invalid network");
        }
    }
}
