#!/usr/bin/env bash

echo "Compiling smart contract"
npx hardhat compile

# ($?) is a return value of previous command
if [ $? -ne 0 ]; then
  echo "compilation error"
  exit 1
fi

# if there's no local ipfs repo, initialize one
if [ ! -d "$HOME/.ipfs" ]; then
  npx go-ipfs init
fi

echo "Running IPFS and development blockchain"
run_eth_cmd="npx hardhat node"
run_ipfs_cmd="npx go-ipfs daemon"

npx concurrently -n eth,ipfs -c yellow,blue "$run_eth_cmd" "$run_ipfs_cmd"
