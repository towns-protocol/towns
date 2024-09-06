package utils

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

// Facet represents the struct returned by the facets() function
type Facet struct {
	FacetAddress common.Address
	Selectors    [][4]byte `json:",omitempty"`
	SelectorsHex []string  `abi:"-"`
	ContractName string    `json:",omitempty"`
	BytecodeHash string    `json:",omitempty"`
}

// ReadAllFacets reads all the facets from the given Diamond contract address
func ReadAllFacets(client *ethclient.Client, contractAddress string, basescanAPIKey string) ([]Facet, error) {
	if client == nil {
		return nil, fmt.Errorf("Ethereum client is nil")
	}

	// Parse the ABI
	contractABI, err := abi.JSON(strings.NewReader(`[
        {
            "inputs": [],
            "name": "facets",
            "outputs": [{
                "components": [
                    {"internalType": "address", "name": "facet", "type": "address"},
                    {"internalType": "bytes4[]", "name": "selectors", "type": "bytes4[]"}
                ],
                "internalType": "struct IDiamondLoupeBase.Facet[]",
                "name": "",
                "type": "tuple[]"
            }],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [{"internalType": "address", "name": "_facet", "type": "address"}],
            "name": "facetFunctionSelectors",
            "outputs": [{"internalType": "bytes4[]", "name": "", "type": "bytes4[]"}],
            "stateMutability": "view",
            "type": "function"
        }
    ]`))
	if err != nil {
		return nil, fmt.Errorf("failed to parse ABI: %w", err)
	}

	// Create a new instance of the contract
	contract := common.HexToAddress(contractAddress)

	// Call the facets() function
	data, err := contractABI.Pack("facets")
	if err != nil {
		return nil, fmt.Errorf("failed to pack data: %v", err)
	}

	result, err := client.CallContract(context.Background(), ethereum.CallMsg{
		To:   &contract,
		Data: data,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to pack data: %w", err)
	}

	// Unpack the result
	var facets []Facet
	err = contractABI.UnpackIntoInterface(&facets, "facets", result)
	if err != nil {
		return nil, fmt.Errorf("failed to unpack result: %w", err)
	}

	basescanUrl, err := GetBasescanUrl(client)
	if err != nil {
		return nil, fmt.Errorf("failed to get Basescan URL: %w", err)
	}

	for i, facet := range facets {
		// read contract name from basescan source code api
		contractName, err := GetContractNameFromBasescan(basescanUrl, facet.FacetAddress.Hex(), basescanAPIKey)
		if err != nil {
			return nil, fmt.Errorf("failed to get contract name from Basescan: %w", err)
		}

		facets[i].ContractName = contractName
		data, err := contractABI.Pack("facetFunctionSelectors", facet.FacetAddress)
		if err != nil {
			return nil, fmt.Errorf("failed to pack data for facetFunctionSelectors: %w", err)
		}

		result, err := client.CallContract(context.Background(), ethereum.CallMsg{
			To:   &contract,
			Data: data,
		}, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to call facetFunctionSelectors: %w", err)
		}

		var selectors []common.Hash
		err = contractABI.UnpackIntoInterface(&selectors, "facetFunctionSelectors", result)
		if err != nil {
			return nil, fmt.Errorf("failed to unpack facetFunctionSelectors result: %w", err)
		}

		// Convert selectors to hex strings
		hexSelectors := make([]string, len(selectors))
		for j, selector := range selectors {
			hexSelectors[j] = BytesToHexString(selector[:])
		}

		facets[i].SelectorsHex = hexSelectors
	}

	return facets, nil
}

func CreateEthereumClients(baseRpcUrl, baseSepoliaRpcUrl, originEnvironment, targetEnvironment string, verbose bool) (map[string]*ethclient.Client, error) {
	clients := make(map[string]*ethclient.Client)

	for _, env := range []string{originEnvironment, targetEnvironment} {
		var rpcUrl string
		if env == "alpha" || env == "gamma" {
			rpcUrl = baseSepoliaRpcUrl
		} else {
			rpcUrl = baseRpcUrl
		}

		client, err := ethclient.Dial(rpcUrl)
		if err != nil {
			return nil, fmt.Errorf("failed to connect to the Ethereum client for %s: %w", env, err)
		}

		clients[env] = client

		if verbose {
			Log.Info().Msgf("Successfully connected to Ethereum client for %s", env)
		}
	}

	return clients, nil
}

// GetBasescanUrl determines the appropriate Basescan API URL based on the chain ID
func GetBasescanUrl(client *ethclient.Client) (string, error) {
	chainID, err := client.ChainID(context.Background())
	if err != nil {
		return "", fmt.Errorf("failed to get chain ID: %w", err)
	}

	switch chainID.Int64() {
	case 8453: // Base Mainnet
		return "https://api.basescan.org", nil
	case 84532: // Base Sepolia
		return "https://api-sepolia.basescan.org", nil
	default:
		return "", fmt.Errorf("unsupported chain ID: %d", chainID)
	}
}

// GetContractNameFromBasescan retrieves the contract name for a given address using the appropriate Basescan API
func GetContractNameFromBasescan(baseURL, address, apiKey string) (string, error) {
	url := fmt.Sprintf("%s/api?module=contract&action=getsourcecode&address=%s&apikey=%s", baseURL, address, apiKey)

	resp, err := http.Get(url)
	if err != nil {
		return "", fmt.Errorf("failed to make request to Basescan API: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response body: %w", err)
	}

	var result struct {
		Status  string `json:"status"`
		Message string `json:"message"`
		Result  []struct {
			ContractName string `json:"ContractName"`
		} `json:"result"`
	}

	err = json.Unmarshal(body, &result)
	if err != nil {
		return "", fmt.Errorf("failed to unmarshal JSON response: %w", err)
	}

	if result.Status != "1" {
		return "", fmt.Errorf("Basescan API error: %s", result.Message)
	}

	if len(result.Result) == 0 {
		return "", fmt.Errorf("no contract found for address %s", address)
	}

	return result.Result[0].ContractName, nil
}

// AddContractCodeHashes reads the contract code for each facet and adds its keccak256 hash to the Facet struct
func AddContractCodeHashes(client *ethclient.Client, facets []Facet) error {
	for i, facet := range facets {
		// Read the contract code
		code, err := client.CodeAt(context.Background(), facet.FacetAddress, nil)
		if err != nil {
			return fmt.Errorf("failed to read contract code for address %s: %w", facet.FacetAddress.Hex(), err)
		}

		// Hash the code using Keccak256Hash
		hash := crypto.Keccak256Hash(code)

		// Store the hash hex string in the Facet struct
		facets[i].BytecodeHash = hash.Hex()
	}

	return nil
}
