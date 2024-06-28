wait:
	./wait.sh

fund-address:
	@if [ -z "$(ADDRESS)" ] || [ -z "$(ETH)" ]; then \
		echo "Error: ADDRESS and ETH must be set"; \
		exit 1; \
	fi

	docker exec erc-4337-devnet-node-1 \
	geth --exec \
	"eth.sendTransaction({from: eth.accounts[0], to: '$(ADDRESS)', value: web3.toWei($(ETH), 'ether')})" \
	attach http://localhost:8545/
