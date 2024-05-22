// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "../common/Deployer.s.sol";
import {ProxyDelegation} from "contracts/src/tokens/river/mainnet/delegation/ProxyDelegation.sol";

// deployments
import {DeployRiverMainnet} from "./DeployRiverMainnet.s.sol";
import {DeployAuthorizedClaimers} from "./DeployAuthorizedClaimers.s.sol";
import {DeployBaseRegistry} from "contracts/scripts/deployments/DeployBaseRegistry.s.sol";

import {MockMessenger} from "contracts/test/mocks/MockMessenger.sol";

contract DeployProxyDelegation is Deployer {
  // Mainnet
  DeployRiverMainnet internal riverHelper = new DeployRiverMainnet();
  DeployAuthorizedClaimers internal claimersHelper =
    new DeployAuthorizedClaimers();

  // Base
  DeployBaseRegistry internal deployBaseRegistry = new DeployBaseRegistry();

  address public riverToken;
  address public claimers;
  address public mainnetDelegation;
  address public messenger;
  address public vault;

  function versionName() public pure override returns (string memory) {
    return "proxyDelegation";
  }

  function setDependencies(
    address mainnetDelegation_,
    address messenger_
  ) external {
    mainnetDelegation = mainnetDelegation_;
    messenger = messenger_;
  }

  function __deploy(address deployer) public override returns (address) {
    riverToken = riverHelper.deploy();
    vault = riverHelper.vault();
    claimers = claimersHelper.deploy();

    if (messenger == address(0)) {
      if (isAnvil() || isTesting()) {
        vm.broadcast(deployer);
        messenger = address(new MockMessenger());
      } else {
        messenger = _getMessenger();
      }
    }

    if (mainnetDelegation == address(0)) {
      mainnetDelegation = _getMainnetDelegation();
    }

    vm.broadcast(deployer);
    return
      address(
        new ProxyDelegation(riverToken, claimers, messenger, mainnetDelegation)
      );
  }

  function _getMainnetDelegation() internal returns (address) {
    if (block.chainid == 84532 || block.chainid == 11155111) {
      // base registry on base sepolia
      return 0x08cC41b782F27d62995056a4EF2fCBAe0d3c266F;
    }

    return getDeployment("baseRegistry");
  }

  function _getMessenger() internal view returns (address) {
    // Base or Base (Sepolia)
    if (block.chainid == 8453 || block.chainid == 84532) {
      return 0x4200000000000000000000000000000000000007;
    } else if (block.chainid == 1) {
      // Mainnet
      return 0x866E82a600A1414e583f7F13623F1aC5d58b0Afa;
    } else if (block.chainid == 11155111) {
      // Sepolia
      return 0xC34855F4De64F1840e5686e64278da901e261f20;
    } else {
      revert("DeployProxyDelegation: Invalid network");
    }
  }
}
