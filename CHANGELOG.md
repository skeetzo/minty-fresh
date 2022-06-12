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


------------------------------------------------------------------------

# TODO

- fix `minty show <token-id>` uint8array concat bug

- update minty-deployment.json process for handling multiple contracts
-- update to handle from addon / plugin project calls

- update addon minty process to use contracts / hardhat found locally in calling project space

- add template prompts for additional NFT metadata; or add in addons?