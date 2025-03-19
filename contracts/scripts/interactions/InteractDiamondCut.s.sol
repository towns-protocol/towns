// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IDiamondCut} from "@towns-protocol/diamond/src/facets/cut/IDiamondCut.sol";
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";

//libraries
import {console} from "forge-std/console.sol";

//contracts
import {Interaction} from "../common/Interaction.s.sol";
import {DiamondHelper} from "contracts/test/diamond/Diamond.t.sol";

// facet
import {DeployWalletLink} from "contracts/scripts/deployments/facets/DeployWalletLink.s.sol";
import {WalletLink} from "contracts/src/factory/facets/wallet-link/WalletLink.sol";

contract InteractDiamondCut is Interaction, DiamondHelper {
  DeployWalletLink helper = new DeployWalletLink();

  function __interact(address deployer) internal override {
    address diamond = getDeployment("spaceFactory");
    address walletLink = getDeployment("walletLinkFacet");

    helper.removeSelector(WalletLink.linkNonEVMWalletToRootKey.selector);
    helper.removeSelector(WalletLink.removeNonEVMWalletLink.selector);
    helper.removeSelector(
      WalletLink.getWalletsByRootKeyWithDelegations.selector
    );
    helper.removeSelector(WalletLink.explicitWalletsByRootKey.selector);
    helper.removeSelector(WalletLink.checkIfNonEVMWalletLinked.selector);
    helper.removeSelector(WalletLink.getDependency.selector);
    helper.removeSelector(WalletLink.setDependency.selector);
    helper.removeSelector(WalletLink.setDefaultWallet.selector);
    helper.removeSelector(WalletLink.getDefaultWallet.selector);

    addCut(helper.makeCut(walletLink, IDiamond.FacetCutAction.Replace));

    bytes4[] memory selectors = new bytes4[](9);
    selectors[0] = WalletLink.linkNonEVMWalletToRootKey.selector;
    selectors[1] = WalletLink.removeNonEVMWalletLink.selector;
    selectors[2] = WalletLink.getWalletsByRootKeyWithDelegations.selector;
    selectors[3] = WalletLink.explicitWalletsByRootKey.selector;
    selectors[4] = WalletLink.checkIfNonEVMWalletLinked.selector;
    selectors[5] = WalletLink.getDependency.selector;
    selectors[6] = WalletLink.setDependency.selector;
    selectors[7] = WalletLink.setDefaultWallet.selector;
    selectors[8] = WalletLink.getDefaultWallet.selector;

    addCut(
      IDiamond.FacetCut({
        facetAddress: walletLink,
        action: IDiamond.FacetCutAction.Add,
        functionSelectors: selectors
      })
    );

    console.log("deployer", deployer);

    bytes memory initData = helper.makeInitData(
      0x00000000000000447e69651d841bD8D104Bed493,
      0xE84cE54cd1Bd71D671A6FB1C8B4329BCBA410092
    );

    vm.broadcast(deployer);
    IDiamondCut(diamond).diamondCut(_cuts, walletLink, initData);
  }
}
