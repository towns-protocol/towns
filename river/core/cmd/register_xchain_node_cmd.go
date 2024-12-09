package cmd

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/spf13/cobra"

	"github.com/river-build/river/core/contracts/base"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/infra"
	"github.com/river-build/river/core/xchain/util"
)

var (
	registerCmd = &cobra.Command{
		Use:   "register <operator-wallet-keyfile>",
		Short: "Register xchain node",
		Args:  cobra.ExactArgs(1),
		RunE:  register,
	}

	unregisterCmd = &cobra.Command{
		Use:   "unregister <operator-wallet-keyfile>",
		Short: "Unregister xchain node",
		Args:  cobra.ExactArgs(1),
		RunE:  unregister,
	}
)

func init() {
	registerCmd.Flags().Bool("approve", false, "automatically approve registration transaction")
	unregisterCmd.Flags().Bool("approve", false, "automatically approve unregistration transaction")

	rootCmd.AddCommand(registerCmd)
	rootCmd.AddCommand(unregisterCmd)
}

func register(cmd *cobra.Command, args []string) error {
	var (
		operatorKeyfile         = args[0]
		userConfirmationMessage = "Register xchain node '%s' from operator '%s'?\n"
		autoApproval, _         = cmd.Flags().GetBool("approve")
	)
	return registerImpl(operatorKeyfile, userConfirmationMessage, true, autoApproval)
}

func unregister(cmd *cobra.Command, args []string) error {
	var (
		operatorKeyfile         = args[0]
		userConfirmationMessage = "Unregister xchain node '%s' from operator '%s'?\n"
		autoApproval, _         = cmd.Flags().GetBool("approve")
	)
	return registerImpl(operatorKeyfile, userConfirmationMessage, false, autoApproval)
}

func registerImpl(operatorKeyfile string, userConfirmationMessage string, register bool, autoApprove bool) error {
	var (
		ctx, cancel                = context.WithTimeout(context.Background(), time.Minute)
		xchainWallet, xWalletErr   = util.LoadWallet(ctx)
		operatorWallet, oWalletErr = crypto.LoadWallet(ctx, operatorKeyfile)
	)
	defer cancel()

	if xWalletErr != nil {
		return fmt.Errorf("unable to load xchain wallet: %s", xWalletErr)
	}
	if oWalletErr != nil {
		return fmt.Errorf("unable to load operator wallet: %s", oWalletErr)
	}

	fmt.Printf(userConfirmationMessage, xchainWallet.Address, operatorWallet.Address)
	if !autoApprove && !askUserConfirmation() {
		return nil
	}

	metrics := infra.NewMetricsFactory(nil, "xchain", "cmdline")
	baseChain, err := crypto.NewBlockchain(ctx, &cmdConfig.BaseChain, operatorWallet, metrics, nil)
	if err != nil {
		return fmt.Errorf("unable to instantiate base chain client: %s", err)
	}

	checker, err := base.NewIEntitlementChecker(cmdConfig.GetEntitlementContractAddress(), baseChain.Client)
	if err != nil {
		return err
	}

	decoder, err := crypto.NewEVMErrorDecoder(base.IEntitlementCheckerMetaData, base.IEntitlementGatedMetaData)
	if err != nil {
		return err
	}

	pendingTx, err := baseChain.TxPool.Submit(
		ctx,
		"RegisterNode or maybe UnregisterNode",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			if err != nil {
				return nil, err
			}
			if register {
				return checker.RegisterNode(opts, xchainWallet.Address)
			}
			return checker.UnregisterNode(opts, xchainWallet.Address)
		},
	)

	ce, se, err := decoder.DecodeEVMError(err)
	switch {
	case ce != nil:
		if register && ce.DecodedError.Sig == "EntitlementChecker_NodeAlreadyRegistered()" {
			fmt.Println("node is already registered")
			return nil
		}
		if !register && ce.DecodedError.Sig == "EntitlementChecker_NodeNotRegistered()" {
			fmt.Println("node isn't registered")
			return nil
		}
		return ce
	case se != nil:
		return se
	case err != nil:
		return err
	}

	receipt, err := pendingTx.Wait(ctx)
	if err != nil {
		return err
	}

	if receipt == nil || receipt.Status != crypto.TransactionResultSuccess {
		return fmt.Errorf("transaction failed")
	}

	if register {
		fmt.Printf("xchain node %s registered\n", xchainWallet.Address)
	} else {
		fmt.Printf("xchain node %s unregistered\n", xchainWallet.Address)
	}

	baseChain.Close()

	return nil
}

func askUserConfirmation() bool {
	fmt.Println("Please confirm [y/N]")
	reader := bufio.NewReader(os.Stdin)

	char, _, err := reader.ReadRune()
	if err != nil {
		panic("unable to ask user for confirmation")
	}
	return char == 'y' || char == 'Y'
}
