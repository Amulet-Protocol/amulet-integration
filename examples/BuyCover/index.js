const anchor = require("@project-serum/anchor");
const web3 = require("@solana/web3.js");
const { getOrCreateAssociatedTokenAccount } = require("@solana/spl-token");
const dotenv = require('dotenv');
dotenv.config();
const idl = require("../../utils/idl/underwriting.json")
const address = require("../../utils/address.json")

async function getCurrentCoverId(connection) {
    // Get current cover id
    const coverMetadataState = await connection.getAccountInfo(new web3.PublicKey(address.coverProgramMetadataState))
    const coverCountData = coverMetadataState.data.slice(656, 664)
    coverCountData.reverse()
    const coverCount = new anchor.BN(coverCountData)
    return coverCount
}

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
    const additionalComputeBudgetInstruction = web3.ComputeBudgetProgram.setComputeUnitLimit({
        units: 280000
    });

    // Get the cover product address
    const productId = "1"
    const product = address.products[productId]

    const coverCount = await getCurrentCoverId(connection)
    const coverId = coverCount.addn(1);
    const coverOwner = wallet.payer.publicKey;
    const coverReferrer = wallet.payer.publicKey;
    const coverProductId = new anchor.BN(productId);
    const coverDurationInDays = new anchor.BN(15);
    const coverCurrency = new web3.PublicKey(address.auwtMint);
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

    const coverCount = await getCurrentCoverId(connection)
    const coverId = coverCount.addn(1);
    const coverOwner = wallet.payer.publicKey;
    const coverReferrer = wallet.payer.publicKey;
    const coverProductId = new anchor.BN(productId);
    const coverDurationInDays = new anchor.BN(15);
    const coverCurrency = new web3.PublicKey(address.auwtMint);
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

    const nftTokenMint = new web3.PublicKey("TmKyuSh7emnPk2dhkRjvHzb9xXpt6eCauHnrgS86tWN")
    const nftAta = await getOrCreateAssociatedTokenAccount(connection, wallet.payer, nftTokenMint, wallet.payer.publicKey)
    const metaplexProgramId = new web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    const [nftMetadataAddress] = web3.PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("metadata"),
        Buffer.from(metaplexProgramId.toBytes().slice(0, 32)),
        Buffer.from(nftTokenMint.toBytes().slice(0, 32))
      ], metaplexProgramId)

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