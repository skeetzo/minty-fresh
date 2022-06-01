#!/bin/bash
wget https://dist.ipfs.io/ipfs-update/v1.8.0/ipfs-update_v1.8.0_linux-amd64.tar.gz
tar -xvzf ipfs-update_v1.8.0_linux-amd64.tar.gz
cd ipfs-update
sudo bash install.sh
ipfs-update --version
cd ..
rm -r ipfs-update

# ipfs-update install 0.9.0
# ipfs-update install latest