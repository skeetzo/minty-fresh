// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
//
import "./CheekSpreader.sol";

/**
 * @title Buttholes
 * @author Skeetzo
 * @dev Stupid (non-Solana) butthole nfts.
 */
contract Buttholes is Ownable, ERC721URIStorage, ERC721Royalty, ERC721PresetMinterPauserAutoId {

  event PuckerUp(address addedButthole, string buttholeHash);
  event PuckerDown(address removedButthole);

  // butthole hashes
  mapping(address => string) public buttholes;
  // account quick mapping
  mapping(address => bool) public buttholeMap;
  // unique butthole owners
  address[] private buttholeOwners;
  // paymentsplitters
  mapping(address => address) private CheekSpreaders;
  // royalty fee - 5%
  uint96 public constant royaltyValue = 200;

  /**
   * @dev Contract constructor. Sets metadata extension `name` and `symbol`.
   */
  constructor(string memory tokenName, string memory symbol) ERC721PresetMinterPauserAutoId(tokenName, symbol, "ipfs://") {}

  ////////////////////////////////////////////////////////////////////////////////////

  // ERC721 //

  function mintToken(address owner, string memory metadataURI) public returns (uint256) {
    // _tokenIds.increment();

    uint256 id = 1;
    super._safeMint(owner, id);
    super._setTokenURI(id, metadataURI);

    return id;
  }



  /**
   * @dev 18+ confirm to enable minting.
   */
  function addMinter() public {
    _setupRole(MINTER_ROLE, _msgSender());
  }

  /**
   * @dev Base URI for computing {tokenURI}. If set, the resulting URI for each
   * token will be the concatenation of the `baseURI` and the `tokenId`. Empty
   * by default, can be overriden in child contracts.
   */
  function _baseURI() internal view virtual override(ERC721, ERC721PresetMinterPauserAutoId) returns (string memory) {
    super._baseURI();
  }

  /**
   * @dev Hook that is called before any token transfer. This includes minting
   * and burning.
   */
  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 tokenId
  ) internal virtual override(ERC721, ERC721PresetMinterPauserAutoId) {
    super._beforeTokenTransfer(from, to, tokenId);
  }

  /**
   * @dev Destroys `tokenId`.
   * The approval is cleared when the token is burned.
   */
  function _burn(uint256 tokenId) internal virtual override(ERC721, ERC721URIStorage, ERC721Royalty) {
    super._burn(tokenId);
  }

  /**
   * @dev Set proper token data for minting.
   */
  function _mint(address to, uint256 tokenId) internal virtual override(ERC721) {
    super._mint(to, tokenId);
    // get random owner of a butthole
    address buttholeOwner = _getButthole();
    // set token uri to be butthole uri of random owner
    _setTokenURI(tokenId, buttholes[buttholeOwner]);
    // set royalty for token id and butthole owner's splitter contract (if exists)
    if (CheekSpreaders[buttholeOwner]!=address(0x0))
      buttholeOwner = CheekSpreaders[buttholeOwner];
    _setTokenRoyalty(tokenId, buttholeOwner, royaltyValue);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC721Royalty, ERC721PresetMinterPauserAutoId) returns (bool) {
    return super.supportsInterface(interfaceId);
  }

  // ERC721URIStorage //

  /**
   * @dev See {IERC721Metadata-tokenURI}.
   */
  function tokenURI(uint256 tokenId) public view virtual override(ERC721, ERC721URIStorage) returns (string memory) {
    return super.tokenURI(tokenId);
  }

  ////////////////////////////////////////////////////////////////////////////////////

  // Buttholes //

  /**
   * @dev Sets `_tokenURI` as the tokenURI of `tokenId`.
   *
   * Requirements:
   *
   * - `newButthole` must not exist as a butthole.
   */
  function addButthole(address newButthole, string memory _tokenURI) public onlyOwner {
    require(!buttholeMap[newButthole], "Buttholes: account must not exist");
    buttholeMap[newButthole] = true;
    buttholeOwners.push(newButthole);
    buttholes[newButthole] = _tokenURI;
    // CheekSpreaders[newButthole] = newButthole;
    emit PuckerUp(newButthole, _tokenURI);
  }

  /**
   * @dev Create a new CheekSpreader contract for handling royalty payments.
   */
  function createCheekSpreader(address donor1, address donor2, address donor3) public {
    require(buttholeMap[_msgSender()], "Buttholes: caller must be a butthole");
    address[] memory payees = new address[](4);
    payees[0] = _msgSender();
    payees[1] = donor1;
    payees[2] = donor2;
    payees[3] = donor3;
    uint256[] memory shares = new uint256[](4);
    shares[0] = 91;
    shares[1] = 3;
    shares[2] = 3;
    shares[3] = 3;
    CheekSpreader c = new CheekSpreader(payees, shares);
    CheekSpreaders[_msgSender()] = address(c);
  }

  /**
   * @dev Create a new CheekSpreader contract for handling royalty payments for an unset butthole.
   */
  function updateCheekSpreader(address buttholeAddress, address donor1, address donor2, address donor3) public onlyOwner {
    require(buttholeMap[buttholeAddress], "Buttholes: address must be a butthole");
    require(CheekSpreaders[buttholeAddress] == address(0x0), "Buttholes: address must not already be set");
    address[] memory payees = new address[](4);
    payees[0] = buttholeAddress;
    payees[1] = donor1;
    payees[2] = donor2;
    payees[3] = donor3;
    uint256[] memory shares = new uint256[](4);
    shares[0] = 91;
    shares[1] = 3;
    shares[2] = 3;
    shares[3] = 3;
    CheekSpreader c = new CheekSpreader(payees, shares);
    CheekSpreaders[buttholeAddress] = address(c);
  }

  /**
   * @dev Return a random uri.
   */
  function _getButthole() internal view returns (address) {
    return buttholeOwners[uint(keccak256(abi.encodePacked(block.difficulty, block.timestamp, buttholeOwners))) % buttholeOwners.length];
  }

  /**
   * @dev Renounce ownership of your own butthole.
   *
   * Requirements:
   *
   * - `_msgSender` must exist as a butthole.
   */
  function renounceButthole() public {
    require(buttholeMap[_msgSender()], "Buttholes: caller must be a butthole");
    delete buttholes[_msgSender()];
    delete CheekSpreaders[_msgSender()];
    buttholeMap[_msgSender()] = false;
    // delete from array of owners
    for (uint i=0;i<buttholeOwners.length;i++)
      if (buttholeOwners[i] == _msgSender())
        delete buttholeOwners[i];
    emit PuckerDown(_msgSender());
  }

}
