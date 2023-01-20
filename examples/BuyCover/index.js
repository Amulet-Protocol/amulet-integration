const anchor = require("@project-serum/anchor");
const web3 = require("@solana/web3.js");
const dotenv = require('dotenv');
dotenv.config();
const idl = require("../../utils/idl/underwriting.json")
const address = require("../../utils/address.json")

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
        units: 240000
    });

    // Get the cover product address
    const product = address.products["1"]

    const coverId = new anchor.BN(1);
    const coverOwner = wallet.payer.publicKey;
    const coverReferrer = wallet.payer.publicKey;
    const coverProductId = new anchor.BN(1);
    const coverDurationInDays = new anchor.BN(365);
    const coverCurrency = new web3.PublicKey(address.auwtMint);
    const coverAmount = new anchor.BN(10 ** 9);
    // Get the cover state pda account address
    const [coverStatePda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(address.coverProgramMetadataState.slice(0, 32)),
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

buyCoverWithoutNFT()