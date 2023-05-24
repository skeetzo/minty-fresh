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
	**1.3.2 : 5-8-2023**
	- project cleanup for retouches
	- removed drizzle client subsection (unnecessary bloat from main focus)
	**1.3.3 : 5-10-2023**
	- more cleanup and updates
	- removal of asset.js in favor of direct .properties and .attributes handling
	- beginning attempts to update code to es6
	- added ability to mint from schemas found already uploaded on IPFS aka add loading schemas from IPFS cid
	**1.3.4 : 5-11-2023**
	- finished update to es6
	- updated properties & attributes references
	**1.3.5 : 5-13-2023**
	- finished most of test_ipfs
	**1.3.6 : 5-15-2023**
	- added test_nft
**1.3.7 : 5-24-2023**
	- finish fleshing out test_nft
	- updated actions
	- reorg minty to mostly static functions to interface with nft class

------------------------------------------------------------------------


# TODO

- finish fleshing out minty functionality between minty & nft
- add more commands to action
- update test_minty

- add additional chains
- figure out an easier way to add all the repeated blockchain/network options
- clean up functionality and inline todos
- update minty.parseEvents as necessary for multiple transfer types / contracts

(loopring)
- add Loopring API -> separate project "ringpops" first for API wrapper (use axios notes)
- add Loopring schema for counterfactual nfts

(tests)
- actually test via test_nft
- update nft.mjs to pass tests
- update ipfs to pass tests (if necessary) 
- test updated properties & attributes interactions w/ testing for retrieving files / CIDs
- fix ipfs uploads / adds --> not appearing in ipfs client
- completely fix the fileExists function
- test multiple metadata properties and attributes upload process
- possibly add direct tests for: nft.js, ipfs.js

(minor)
- add ipns & updateable metadata functionality
- update "NFT"-centric design to more tokenized generality --> works for ERC20s, (specifically) ERC1155s

(major)
- add method for interacting with private / anonymous wallets; possibly on remote nodes
- finalize & test process for minty being ran on mainnets and with live wallets (privately)
- update / add docstring comments


# Links


# Dev

Run:

npm link


# Tests

add ipfs tests:

add
remove
getIPFS
getIPFSString
getIPFSBase64
getIPFSJSON
pin
unpin
isPinned
stripIpfsUriPrefix
ensureIpfsUriPrefix
makeGatewayURL
extractCID
validateCIDString

add nft tests:
get properties
get attributes
unpin

add minty tests:
burn
get properties
get attributes