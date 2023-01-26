const anchor = require("@project-serum/anchor");
const web3 = require("@solana/web3.js");
const { getOrCreateAssociatedTokenAccount } = require("@solana/spl-token");
const dotenv = require('dotenv');
dotenv.config();
const idl = require("../../utils/idl/underwriting.json")
const coverIdl = require("../../utils/idl/cover.json")
const address = require("../../utils/address.json")

/**
 * As the cover id is incremental. This function is called to get
 * the current latest cover id from the metadata state and used it
 * to generate next cover id for `buyCover` function.
 * @param  {anchor.AnchorProvider} provider Anchor provider
 * @return {anchor.BN} The current latest cover id
 */
async function getCurrentCoverId(provider) {
    const programId = new web3.PublicKey(coverIdl.metadata.address)
    const program = new anchor.Program(coverIdl, programId, provider)
    const coverMetadataState = await program.account.coverMetadataState.fetch(new web3.PublicKey(address.coverProgramMetadataState))
    return coverMetadataState.coverCount
}

/**
 * Buy cover sample function without NFT token
 */
async function buyCoverWithoutNFT() {
    const connection = new web3.Connection(process.env.RPC_URL)
    const secretKey = Buffer.from(JSON.parse(process.env.SECRET_KEY))
    const wallet = new anchor.Wallet(web3.Keypair.fromSecretKey(secretKey))
    const confirmOpts = {
        preflightCommitment: "recent",
        commitment: "recent",
    }
    const provider = new anchor.AnchorProvider(connection, wallet, confirmOpts)
    const programId = new web3.PublicKey(idl.metadata.address)
    const program = new anchor.Program(idl, programId, provider )
    // Increase the maximum compute unit
    const additionalComputeBudgetInstruction = web3.ComputeBudgetProgram.setComputeUnitLimit({
        units: 280000
    });

    // Get the cover product address
    const productId = "1"
    const product = address.products[productId]
    // Get current cover id
    const coverCount = await getCurrentCoverId(provider)
    // Generate the latest cover id by increment it with 1
    const coverId = coverCount.addn(1);
    // The cover owner should be the same as the signer
    const coverOwner = wallet.payer.publicKey;
    // Since there is no refferal, the cover referrer is set as the same as cover owner
    const coverReferrer = wallet.payer.publicKey;
    // The product id
    const coverProductId = new anchor.BN(productId);
    // Cover duration in days, here it is set as 15 days
    const coverDurationInDays = new anchor.BN(15);
    // Cover currency by default is fixed in aUWT
    const coverCurrency = new web3.PublicKey(address.auwtMint);
    // Cover amount in aUWT, here it is set as 1 aUWT
    const coverAmount = new anchor.BN(10 ** 9);
    // Get the cover state pda account address
    const [coverStatePda] = await anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(new web3.PublicKey(address.coverProgramMetadataState).toBytes().slice(0, 32)),
        Buffer.from(anchor.utils.bytes.utf8.encode("cover_account_seed")),
        Buffer.from(coverId.toString().slice(0, 32))
      ],
      new web3.PublicKey(address.Programs.CoverProgram)
    );
    // Execute buy cover instruction
    const tx = await program.methods.buyCover(
        coverId,
        coverOwner,
        coverReferrer,
        coverProductId,
        coverDurationInDays,
        coverCurrency,
        coverAmount
    ).accounts({
        programMetadataState: address.underwritingProgramMetadataState,
        productState: product.productStatePda,
        poolMetadataState: address.poolProgramMetadataState,
        premiumPoolAccountPda: address.premiumPoolAccountPda,
        auwtState: address.auwtState,
        individualPoolState: product.individualPoolStatePda,
        quotationMetadataState: address.quotationProgramMetadataState,
        quotationState: product.quotationStatePda,
        quotationResultState: address.quotationResultState,
        coverMetadataState: address.coverProgramMetadataState,
        coverState: coverStatePda,
        underwritingCallerAuthPda: address.underwritingCallerAuthPda,
        buyer: wallet.payer.publicKey,
        nftAta: anchor.web3.SystemProgram.programId,
        nftMetadataState: anchor.web3.SystemProgram.programId,
        sysvarClock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        quotationProgram: address.Programs.QuotationProgram,
        auwtProgram: address.Programs.AuwtTokenProgram,
        coverProgram: address.Programs.CoverProgram,
        poolProgram: address.Programs.PoolProgram,
        systemProgram: anchor.web3.SystemProgram.programId
    }).preInstructions([
        additionalComputeBudgetInstruction
    ]).signers([wallet.payer])
    .rpc();
    console.log("Your transaction 'buyCover' signature: ", tx);
}

/**
 * Buy cover sample function with NFT token for premium discount
 */
async function buyCoverWithNFT() {
    const connection = new web3.Connection(process.env.RPC_URL)
    const secretKey = Buffer.from(JSON.parse(process.env.SECRET_KEY))
    const wallet = new anchor.Wallet(web3.Keypair.fromSecretKey(secretKey))
    const confirmOpts = {
        preflightCommitment: "recent",
        commitment: "recent",
    }
    const provider = new anchor.AnchorProvider(connection, wallet, confirmOpts)
    const programId = new web3.PublicKey(idl.metadata.address)
    const program = new anchor.Program(idl, programId, provider )
    const additionalComputeBudgetInstruction = web3.ComputeBudgetProgram.setComputeUnitLimit({
        units: 300000
    });

    // Get the cover product address
    const productId = "1"
    const product = address.products[productId]
    // Get current cover id
    const coverCount = await getCurrentCoverId(provider)
    // Generate the latest cover id by increment it with 1
    const coverId = coverCount.addn(1);
    // The cover owner should be the same as the signer
    const coverOwner = wallet.payer.publicKey;
    // Since there is no refferal, the cover referrer is set as the same as cover owner
    const coverReferrer = wallet.payer.publicKey;
    // The product id
    const coverProductId = new anchor.BN(productId);
    // Cover duration in days, here it is set as 15 days
    const coverDurationInDays = new anchor.BN(15);
    // Cover currency by default is fixed in aUWT
    const coverCurrency = new web3.PublicKey(address.auwtMint);
    // Cover amount in aUWT, here it is set as 1 aUWT
    const coverAmount = new anchor.BN(10 ** 9);
    // Get the cover state pda account address
    const [coverStatePda] = await anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(new web3.PublicKey(address.coverProgramMetadataState).toBytes().slice(0, 32)),
        Buffer.from(anchor.utils.bytes.utf8.encode("cover_account_seed")),
        Buffer.from(coverId.toString().slice(0, 32))
      ],
      new web3.PublicKey(address.Programs.CoverProgram)
    );

    // The NFT mint token address, currently supports Metabears Collection — Basic, Elite, Pro
    const nftTokenMint = new web3.PublicKey("TmKyuSh7emnPk2dhkRjvHzb9xXpt6eCauHnrgS86tWN")
    // Create or get the NFT token account address
    const nftAta = await getOrCreateAssociatedTokenAccount(connection, wallet.payer, nftTokenMint, wallet.payer.publicKey)
    // The NFT token metadata is based on Metaplex standard, 
    // https://docs.metaplex.com/programs/token-metadata/accounts#metadata
    // thus we need to get the token metadata PDA account address
    const metaplexProgramId = new web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    const [nftMetadataAddress] = web3.PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("metadata"),
        Buffer.from(metaplexProgramId.toBytes().slice(0, 32)),
        Buffer.from(nftTokenMint.toBytes().slice(0, 32))
      ], metaplexProgramId)
    // Execute buy cover instruction
    const tx = await program.methods.buyCover(
        coverId,
        coverOwner,
        coverReferrer,
        coverProductId,
        coverDurationInDays,
        coverCurrency,
        coverAmount
    ).accounts({
        programMetadataState: address.underwritingProgramMetadataState,
        productState: product.productStatePda,
        poolMetadataState: address.poolProgramMetadataState,
        premiumPoolAccountPda: address.premiumPoolAccountPda,
        auwtState: address.auwtState,
        individualPoolState: product.individualPoolStatePda,
        quotationMetadataState: address.quotationProgramMetadataState,
        quotationState: product.quotationStatePda,
        quotationResultState: address.quotationResultState,
        coverMetadataState: address.coverProgramMetadataState,
        coverState: coverStatePda,
        underwritingCallerAuthPda: address.underwritingCallerAuthPda,
        buyer: wallet.payer.publicKey,
        nftAta: nftAta.address,
        nftMetadataState: nftMetadataAddress,
        sysvarClock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        quotationProgram: address.Programs.QuotationProgram,
        auwtProgram: address.Programs.AuwtTokenProgram,
        coverProgram: address.Programs.CoverProgram,
        poolProgram: address.Programs.PoolProgram,
        systemProgram: anchor.web3.SystemProgram.programId
    }).preInstructions([
        additionalComputeBudgetInstruction
    ]).signers([wallet.payer])
    .rpc();
    console.log("Your transaction 'buyCover' signature: ", tx);
}

buyCoverWithNFT()
buyCoverWithoutNFT()