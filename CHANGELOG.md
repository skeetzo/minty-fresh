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
	- added a metadata schema validation process
	**1.0.6 : 6/15/2022**
	- more nft implementing
	- updated json schemas
	**1.0.7 : 6/16/2022**
	- finished implementing template prompts --> promptNFTMetadata
	- debugged prompt process
	**1.1.0 : 6/17/2022**
	- finished implementing json schemas to validate metadata --> validateSchema in index.js
	- finished implementing all of the schema parser via cli for creating nft metadata
	**1.1.1 : 6/21/2022**
	- moved helper code around for easier addon experience
	- updated minty for uploading multiple assets references at once along with image; image, placeholder, image_data, etc
	**1.2.0 : 6/27/2022**
	- added truffle-config.js to more easily implement drizzle; may remove hardhat in future
	- added Drizzle front end for basic web interface
	**1.2.1 : 6/28/2022**
	- continued updating drizzle react layout
	**1.2.2 : 7/21/2022**
	- removed hardhat references in place of direct ethers implementation
	- updated dynamic / multichain|network contract interaction in Minty init phase; requires testing 
	**1.2.3 : 7/22/2022**
	- updated Minty arg + config flow
	- added option for providing contract address instead of contract name
	- updated process to fetch contracts from local project spaces
	- added 'network' option for interacting with different networks
	**1.2.4 : 7/28/2022**
	- update method names in minty object to remove unnecessary nft wordings
	- reorged files again for react-client simplicity
	- added submodule export for helpers.js
	- added method for addons to be able to add prompts to the mint process / detect metadata schemas by adding submodule export
	- added dynamic minting functionality -> config.mintFunction, config.mintBatchFunction
	**1.2.5 : 7/29/2022**
	- split ipfs / nft utility further from main minty class
	- more inheritence setups for addons
	**1.2.6 : 8/1/2022**
	- minor reorg updates to keep up with LoveBoat / Bacchus
	- more functions fleshed out in nft.js
	**1.2.7 : 8/2/2022**
	- more patchwork updates
	- added skeleton for minty tests; chai notes
	**1.2.8 : 8/3/2022**
	- more cleanup & test preps
	**1.2.9 : 8/4/2022**
	- added tests
	- updated test_Minty.js & test_MintyPreset.js w/ basic erc721 functionality checks (fixed contract minting inheritence)
	- began tests & debugging for test_minty.js
	**1.2.10 : 8/5/2022**
	- more updates to test_minty.js --> almost complete
	- finished testing basic mint process
	**1.2.11 : 8/6/2022**
	- more attempts to debug the ipfs uploads
	- package updates
	**1.3.0 : 8/8/2022**
	- finished tests for test_minty.js
	-- finished getNFT & pin
	- finished all the updates to get minty.js, nft.js and ipfs.js working (minus ipfs upload bug)
	- finished nft.js: metadata creation, schema loads from ipfs, upload function
	- wrote tests for each cli process, including multiple asset uploads
	- tested new changes to interacting with a contract on a network
	- removed the "default" values from simple.json schema; added test schema (duh)
	-- ALL TESTS SUCCESSFUL (sorta) --
	**1.3.1 : 8/9/2022**
	- added Asset class for tracking ipfs FileObjects better
	- added complicated-test.json schema for testing multiple asset uploads later
	- "fixed" ipfs webgui bug; need to finish asset.js before recontinuing ipfs tests
	**1.3.2 : 4-20-2025**
	- review & check in
	- project cleanup
	**1.3.3 : 4-21-2025**
	- project update to es6 to fix import error for kubo
	- updated packages
	**1.3.4 : 4-22-2025**
	- cleanup exports in packages.json
	- beginning sync with ContentNFTs
	**1.3.5 : 4-23-2025**
	- write basic tests for asset class
	- updated asset.js for retrieving asset objects
	- finished asset tests
	- finished added asset.js class & interactions w/ testing for retrieving asset objects
	- added basic tests for nft class
	**1.3.6 : 4-24-2025**
	- finished debugging nft pin test after adding local pinning service
	-- fix ipfs uploads / adds --> not appearing in ipfs client
	--- was this fixed in the webgui fix in 1.3.1?
	--- yes it was?
	- finished debugging asset tests
	- updated asset/nft classes to properly update metadata values for upload
	- tested scripts in ContentNFTs to test asset / nft / ipfs classes
	- finished integrating with ContentNFTs and LoveBoat
	- finished beginning sync with LoveBoat & ContentNFTs
	**1.3.7 : 4-26-2025**
	- added getconfig fork w/ update to ESM
	-- npm i getconfig@skeetzo/getconfig --save
**1.3.8 : 4-28-2025**
- updates /fixes to asset upload process 
- updated tests
- cleanup / testing how ipfs upload paths work, might remove all base paths for now
**1.3.9 : 4-29-2025**
- debugging prompt sequence
- finished updating getconfig
**1.3.10 : 4-30-2025**
- finished updates to prompt sequence
**1.3.11 : 7-9-2025**
- added: skipAttributes & skipProperties to further optionally skip cli processes
**1.3.12 : 10-27-2025**
- updates to encryption process; passes through from asset instead of via metadata
**1.3.13 : 10-30-2025**
- more encryption key debugging
**1.3.14 : 11-3-2025**
- successfuly encryption debugging
- removed iv & key
**1.3.15 : 11-5-2025**
- clean up encryption debugging process
- figured out how to signal to encrypt an asset better (read metadata beforehand)
- cleanup private/public.pem process for key for encrypting files; added /keys
- updated encryption process to be able to set the private key doing the encrypting (already possible)
-- project syncs complete --
- updated project to mint for LoveBoat, FreeWilly, ContentNFTs, etc
- can upload (encrypted) content data --> IPFS
**1.4.0 : 11-6-2025**
- moved contentNFTs metadata writing server here
**1.4.1 : 11-13-2025**
- updated metadata client to read/write multiple files
**1.4.2 : 11-15-2025**
- fixed metadata writing 
- debugged collection (batch/folder) tagging process for app
- updated metadata client to organize uploads by collection
- updated upload path for collections to ~/Pictures/collections
- copied basic contract setup from contentNFTs/app for future use fetching performer data for writing metadata
**1.4.3 : 11-27-2025**
- updated app/index layout to match current content needs
**1.4.4 : 11-28-2025**
- updated to dropdown for content type
**1.4.5 : 12-1-2025**
- added ability to read date time from metadata
**1.4.6 : 12-3-2025**
- minor touchups to match contentnfts upload; quited logs more
- updated encryptFile to account for larger file sizes

------------------------------------------------------------------------



# TODO

(app)
- update w/ web3/ipfs database to pull from to get the performer IDs
-- token id of assigned loveboat token --> tba address --> did:address --> mix of private & public data of performer
-- finish adding / updating app for metadata handling --

(smart contract stuff)
- cleanup / isolate all smart contract operations vs IPFS operations
- update minty.parseEvents as necessary for multiple transfer types / contracts

(cleanup)
- remove unnecessary code
- add tests for: nft.js, ipfs.js, maybe even asset.js
- check tests
- write tests for multiple asset upload process
- update / add docstring comments

(todo eventually)
- update app/index to build off of schemas dynamically and populate based on loaded schema
- update contract interactions to work with other tokens --> ERC20s, ERC1155s
- add ability to mint from schemas found already uploaded on IPFS aka add loading schemas from IPFS cid

# BUGs
- completely fix the fileExists function (is it broken?)
- need to add better validation steps for prompting input, problem when everything becomes a string: strings -> integer

# Dev

npm link
npm i getconfig@skeetzo/getconfig --save

# Links

https://github.com/trufflesuite/drizzle
https://trufflesuite.com/docs/drizzle/react/react-integration/
https://trufflesuite.com/guides/getting-started-with-drizzle-and-react/#install-drizzle
https://blog.logrocket.com/using-drizzle-react-write-dapp-frontends/
https://reactjs.org/docs/introducing-jsx.html