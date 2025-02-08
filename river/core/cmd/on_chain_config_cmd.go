package cmd

import (
	"context"
	"encoding/csv"
	"encoding/hex"
	"fmt"
	"os"
	"slices"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/spf13/cobra"
	"gopkg.in/yaml.v3"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

func printOnChainConfig(cmd *cobra.Command, args []string) error {
	ctx := cmd.Context()
	cfg := cmdConfig

	blockchain, err := crypto.NewBlockchain(
		ctx,
		&cfg.RiverChain,
		nil,
		infra.NewMetricsFactory(nil, "river", "cmdline"),
		nil,
	)
	if err != nil {
		return err
	}

	config, err := crypto.NewOnChainConfig(
		ctx,
		blockchain.Client,
		cfg.RegistryContract.Address,
		blockchain.InitialBlockNum,
		blockchain.ChainMonitor,
	)
	if err != nil {
		return err
	}

	fmt.Printf("Current block: %d\n", config.ActiveBlock())

	yaml, err := yaml.Marshal(config.Get())
	if err != nil {
		return err
	}
	fmt.Printf("Config:\n%s\n", string(yaml))
	return nil
}

func getOnChainConfig(cmd *cobra.Command, args []string) error {
	ctx := cmd.Context()
	cfg := cmdConfig
	key := args[0]
	valueType := ""
	if len(args) > 1 {
		valueType = args[1]
		if !slices.Contains(crypto.AbiTypeName_All, valueType) {
			return RiverError(Err_INVALID_ARGUMENT, "invalid value type", "type", valueType)
		}
	} else {
		valueType = crypto.AllKnownOnChainSettingKeys()[key]
	}

	blockchain, err := crypto.NewBlockchain(
		ctx,
		&cfg.RiverChain,
		nil,
		infra.NewMetricsFactory(nil, "river", "cmdline"),
		nil,
	)
	if err != nil {
		return err
	}

	caller, err := river.NewRiverConfigV1Caller(cfg.RegistryContract.Address, blockchain.Client)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()

	opts := &bind.CallOpts{
		Context: ctx,
	}
	settings, err := caller.GetConfiguration(opts, crypto.HashSettingName(key))
	if err != nil {
		return err
	}

	if len(settings) == 0 {
		return RiverError(Err_INTERNAL, "returned settings are empty")
	}

	for _, s := range settings {
		fmt.Printf("block: %d\n", s.BlockNumber)
		switch valueType {
		case "":
			fmt.Printf("%s\n", hex.EncodeToString(s.Value))
		case crypto.AbiTypeName_Uint64:
			num, err := crypto.ABIDecodeUint64(s.Value)
			if err != nil {
				return err
			}
			fmt.Printf("%d\n", num)
		case crypto.AbiTypeName_Int64:
			num, err := crypto.ABIDecodeInt64(s.Value)
			if err != nil {
				return err
			}
			fmt.Printf("%d\n", num)
		case crypto.AbiTypeName_Uint64Array:
			nums, err := crypto.ABIDecodeUint64Array(s.Value)
			if err != nil {
				return err
			}
			fmt.Println(nums)
		case crypto.AbiTypeName_String:
			str, err := crypto.ABIDecodeString(s.Value)
			if err != nil {
				return err
			}
			fmt.Printf("%s\n", str)
		default:
			return RiverError(Err_INVALID_ARGUMENT, "invalid value type", "type", valueType)
		}
	}

	return nil
}

func encodeValue(valueType string, value string) ([]byte, error) {
	switch valueType {
	case crypto.AbiTypeName_Uint64:
		num, err := strconv.ParseUint(value, 10, 64)
		if err != nil {
			return nil, err
		}
		return crypto.ABIEncodeUint64(num), nil
	case crypto.AbiTypeName_Int64:
		num, err := strconv.ParseInt(value, 10, 64)
		if err != nil {
			return nil, err
		}
		return crypto.ABIEncodeInt64(num), nil
	case crypto.AbiTypeName_String:
		return crypto.ABIEncodeString(value), nil
	case crypto.AbiTypeName_Uint64Array:
		strNums := strings.Split(value, ",")
		nums := make([]uint64, len(strNums))
		for i, strNum := range strNums {
			num, err := strconv.ParseUint(strings.TrimSpace(strNum), 10, 64)
			if err != nil {
				return nil, RiverError(Err_INVALID_ARGUMENT, "invalid uint64 value", "value", strNum)
			}
			nums[i] = num
		}
		return crypto.ABIEncodeUint64Array(nums), nil
	default:
		return nil, RiverError(Err_INVALID_ARGUMENT, "invalid value type", "type", valueType)
	}
}

type setArgs struct {
	key      string
	blockNum uint64
	value    []byte
}

func parseSetArgs(args []string, force bool) (setArgs, error) {
	if len(args) < 3 || len(args) > 4 {
		return setArgs{}, RiverError(
			Err_INVALID_ARGUMENT,
			"need key, blockNum, value, and optionally type",
			"len",
			len(args),
		)
	}
	key := args[0]
	knownType, ok := crypto.AllKnownOnChainSettingKeys()[key]
	if !ok {
		if !force {
			return setArgs{}, RiverError(Err_INVALID_ARGUMENT, "key is not known", "key", key)
		}
	}
	blockNumStr := args[1]
	value := args[2]
	var valueType string
	if len(args) > 3 {
		valueType = args[3]
	}

	if valueType == "" {
		if knownType == "" {
			return setArgs{}, RiverError(Err_INVALID_ARGUMENT, "need explicit type for key", "key", key)
		}
		valueType = knownType
	} else if !force && knownType != valueType {
		return setArgs{}, RiverError(Err_INVALID_ARGUMENT, "type mismatch for key", "key", key, "known_type", knownType, "provided_type", valueType)
	}

	blockNum, err := strconv.ParseUint(blockNumStr, 10, 64)
	if err != nil {
		return setArgs{}, err
	}

	valueBytes, err := encodeValue(valueType, value)
	if err != nil {
		return setArgs{}, err
	}

	return setArgs{
		key:      key,
		blockNum: blockNum,
		value:    valueBytes,
	}, nil
}

func submitConfig(ctx context.Context, cfg *config.Config, args []setArgs) error {
	wallet, err := crypto.NewWalletFromEnv(ctx, "PRIVATE_KEY")
	if err != nil {
		return err
	}

	blockchain, err := crypto.NewBlockchain(
		ctx,
		&cfg.RiverChain,
		wallet,
		infra.NewMetricsFactory(nil, "river", "cmdline"),
		nil,
	)
	if err != nil {
		return err
	}

	caller, err := river.NewRiverConfigV1Transactor(cfg.RegistryContract.Address, blockchain.Client)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()

	var txs []crypto.TransactionPoolPendingTransaction
	for _, arg := range args {
		fmt.Printf("Setting %s to %s on block %d\n", arg.key, hex.EncodeToString(arg.value), arg.blockNum)
		tx, err := blockchain.TxPool.Submit(
			ctx,
			"SetConfiguration",
			func(opts *bind.TransactOpts) (*types.Transaction, error) {
				return caller.SetConfiguration(
					opts,
					crypto.HashSettingName(arg.key),
					arg.blockNum,
					arg.value,
				)
			},
		)
		if err != nil {
			return err
		}
		txs = append(txs, tx)
	}

	var ret_err error
	for i, tx := range txs {
		receipt, err := tx.Wait(ctx)
		if err != nil {
			fmt.Printf("Failed to get receipt for tx %d for key %s: %s\n", i, args[i].key, err)
			ret_err = err
			continue
		}
		if receipt.Status != types.ReceiptStatusSuccessful {
			fmt.Printf("Transaction %s for key %s failed\n", receipt.TxHash, args[i].key)
			ret_err = RiverError(Err_INTERNAL, "transaction failed", "tx", receipt.TxHash)
		}
	}

	return ret_err
}

func setOnChainConfig(cmd *cobra.Command, args []string) error {
	ctx := cmd.Context()
	cfg := cmdConfig

	force, err := cmd.Flags().GetBool("force")
	if err != nil {
		return err
	}

	sa, err := parseSetArgs(args, force)
	if err != nil {
		return err
	}

	return submitConfig(ctx, cfg, []setArgs{sa})
}

func setOnChainConfigFromCSV(cmd *cobra.Command, args []string) error {
	ctx := cmd.Context()
	cfg := cmdConfig
	file := args[0]

	force, err := cmd.Flags().GetBool("force")
	if err != nil {
		return err
	}

	f, err := os.Open(file)
	if err != nil {
		return err
	}
	defer f.Close()

	r := csv.NewReader(f)
	records, err := r.ReadAll()
	if err != nil {
		return err
	}

	var setArgsList []setArgs
	for _, record := range records {
		sa, err := parseSetArgs(record, force)
		if err != nil {
			return err
		}
		setArgsList = append(setArgsList, sa)
	}

	return submitConfig(ctx, cfg, setArgsList)
}

func printOnChainConfigNames(cmd *cobra.Command, args []string) error {
	names := crypto.AllKnownOnChainSettingKeys()
	keys := make([]string, 0, len(names))
	for key := range names {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, name := range keys {
		fmt.Printf("%s    %s\n", name, names[name])
	}
	return nil
}

func init() {
	onChainConfigCmd := &cobra.Command{
		Use:   "on-chain-config",
		Short: "On-chain config interaction commands",
	}
	rootCmd.AddCommand(onChainConfigCmd)

	onChainConfigCmd.AddCommand(&cobra.Command{
		Use:   "print",
		Short: "Print current on-chain config",
		RunE:  printOnChainConfig,
	})

	onChainConfigCmd.AddCommand(&cobra.Command{
		Use:   "get <key> [abi_type]",
		Short: "Get on-chain config.",
		Args:  cobra.RangeArgs(1, 2),
		RunE:  getOnChainConfig,
	})

	setCmd := &cobra.Command{
		Use:   "set <key> <blockNumber> <value> [abi_type]",
		Short: "Set on-chain config. Requires PRIVATE_KEY to be set.",
		Args:  cobra.RangeArgs(3, 4),
		RunE:  setOnChainConfig,
	}
	setCmd.Flags().Bool("force", false, "Force setting even if name is unknown or there is type mismatch")
	onChainConfigCmd.AddCommand(setCmd)

	setCsvCmd := &cobra.Command{
		Use:   "set-csv <file>",
		Short: "Set on-chain config from CSV file: key,blockNumber,value>,[abi_type]. Requires PRIVATE_KEY to be set.",
		Args:  cobra.ExactArgs(1),
		RunE:  setOnChainConfigFromCSV,
	}
	setCsvCmd.Flags().Bool("force", false, "Force setting even if name is unknown or there is type mismatch")
	onChainConfigCmd.AddCommand(setCsvCmd)

	onChainConfigCmd.AddCommand(&cobra.Command{
		Use:   "names",
		Short: "Print known on-chain config names and types",
		RunE:  printOnChainConfigNames,
	})
}
