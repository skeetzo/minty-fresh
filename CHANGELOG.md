# Changelog

**1.0.1 : 5/31/2022**
	- setup
	- updates to `minty deploy`
	- added gasLimit calculations to mint process
	**1.0.2 : 6/2/2022**
	- implemented addon methodology
	-- addons should have code locally in project repos; should call 'minty' command from repo/ base folder; should detect 'minty' file via .env for additional program options 
	**1.0.3 : 6/11/2022**
	- updated go-ipfs --> fixed ipfs error in ./start-local-environment.sh
	**1.0.4 : 6/12/2022**
	- fix `minty show <token-id>` "TypeError: uint8ArrayConcat is not a function" and then proceeding "TypeError: uint8ArrayToString is not a function" issue
	- added better error handling for missing token id queries
	- added additional output to mint & show processes
	- updated minty-deployment.json process for handling multiple contracts; no longer uses assignment in local config for path
	**1.0.5 : 6/14/2022**
	- added beginning work for template prompts for additional NFT metadata to be entered upon creation 
	**1.0.6 : 6/15/2022**
	- more nft implementing
	- updated json schemas

------------------------------------------------------------------------

- finish implementing template prompts --> promptNFTMetadata



- finish implementing json schemas to validate metadata
- finish implementing the schema parser via cli for creating nft metadata

# TODO

- update comment documentation

- add method for addons to be able to add prompts to the mint process / detect metadata schemas
- add a metadata schema validation process


- add option for providing contract address instead of contract name
-- contract address should retrieve contract name from existing deployment on blockchain
- add 'live' option for allowing transactions on mainnets
- add method for interacting with wallets
-- add most of the above to the config

- create process for minty being ran on mainnets and with live wallets
- add method to connect to ipfs without starting local ipfs daemon

- update minty addon process to use contracts from local project spaces

- add Drizzle front end
npm install --save @drizzle/store

