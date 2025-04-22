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

------------------------------------------------------------------------

- finish integrating with ContentNFTs and LoveBoat





- finish added asset.js class & interactions w/ testing for retrieving asset objects --> finish what?
- test new multiple asset upload process --> how?

-- fix ipfs uploads / adds --> not appearing in ipfs client
--- was this fixed in the webgui fix in 1.3.1?


- update project to sync with LoveBoat, FreeWilly, and ContentNFTs
-- must be able to upload: content data --> IPFS
-- must be able to mint: content token --> loveboat TBA | content wallet TBA
-- must be able to mint: king token --> loveboat TBA | content wallet TBA (| or other project wallet TBA)

what is uploaded? how?
- content data is uploaded
- content object is uploaded that points to content data
--------------------------------
either custom fx here or via contentNFTs:
- content is added to contract
- token is minted
- content is minted


# TODO

- add ipns & updateable metadata functionality

(smart contract stuff)
- cleanup / isolate all smart contract operations vs IPFS operations
- update minty.parseEvents as necessary for multiple transfer types / contracts
- add back in hardhat w/ contract debugging stuff

(todo eventually)
- possibly add direct tests for: nft.js, ipfs.js, maybe even asset.js
- completely fix the fileExists function (is it broken?)
- [minty][cli] figure out an easier way to add all the repeated blockchain/network options
- [minty][cli] add method for interacting with private / anonymous wallets; possibly on remote nodes
- [minty][design] update "NFT"-centric design to more tokenized generality --> works for ERC20s, (specifically) ERC1155s
- [minty][design] finalize & test process for minty being ran on mainnets and with live wallets
- [minty][cli] add ability to mint from schemas found already uploaded on IPFS aka add loading schemas from IPFS cid
- [react][drizzle] finish drizzle react ui
- [react][drizzle] update drizzle-react ui to autopopulate with necessary (autogenerated?) contract code  
- [cleanup] update / add docstring comments

# Links

https://github.com/trufflesuite/drizzle
https://trufflesuite.com/docs/drizzle/react/react-integration/
https://trufflesuite.com/guides/getting-started-with-drizzle-and-react/#install-drizzle
https://blog.logrocket.com/using-drizzle-react-write-dapp-frontends/
https://reactjs.org/docs/introducing-jsx.html

# Dev

npm link
npm install --save @drizzle/store