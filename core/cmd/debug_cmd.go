package cmd

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"

	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/http_client"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/registries"
)

func runDebugCallstacksDownloadCmd(cmd *cobra.Command, args []string) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here

	dir := args[0]
	err := os.MkdirAll(dir, 0755)
	if err != nil {
		return err
	}

	blockchain, err := crypto.NewBlockchain(
		ctx,
		&cmdConfig.RiverChain,
		nil,
		infra.NewMetricsFactory(nil, "river", "cmdline"),
		nil,
	)
	if err != nil {
		return err
	}

	registryContract, err := registries.NewRiverRegistryContract(
		ctx,
		blockchain,
		&cmdConfig.RegistryContract,
		&cmdConfig.RiverRegistry,
	)
	if err != nil {
		return err
	}

	blockNum, err := blockchain.GetBlockNumber(ctx)
	if err != nil {
		return err
	}

	nodes, err := registryContract.GetAllNodes(ctx, blockNum)
	if err != nil {
		return err
	}

	client, err := http_client.GetHttpClient(ctx, cmdConfig)
	if err != nil {
		return err
	}

	for _, node := range nodes {
		fmt.Println(node.NodeAddress.Hex(), node.Url)

		url, err := url.Parse(node.Url + "/debug/stacks")
		if err != nil {
			return err
		}

		req := http.Request{
			Method: "GET",
			URL:    url,
		}
		resp, err := client.Do(&req)
		if err != nil {
			return err
		}

		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return err
		}

		filename := filepath.Join(dir, fmt.Sprintf("callstack.%s.txt", url.Host))
		err = os.WriteFile(filename, body, 0644)
		if err != nil {
			return err
		}

		fmt.Println("    Saved to", filename)
	}
	return nil
}

func init() {
	cmdDebug := &cobra.Command{
		Use:   "debug",
		Short: "Debugging assistance commands",
	}

	cmdDebugCallstacks := &cobra.Command{
		Use:   "callstacks",
		Short: "Download and analyze callstacks commands",
	}

	cmdDebugCallstacksDownload := &cobra.Command{
		Use:   "download <directory>",
		Short: "Download callstacks to given directory",
		Args:  cobra.ExactArgs(1),
		RunE:  runDebugCallstacksDownloadCmd,
	}

	cmdDebugCallstacks.AddCommand(cmdDebugCallstacksDownload)
	cmdDebug.AddCommand(cmdDebugCallstacks)
	rootCmd.AddCommand(cmdDebug)
}
