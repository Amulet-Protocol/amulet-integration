const anchor = require("@project-serum/anchor")
const dotenv = require('dotenv');
dotenv.config();
const web3 = require("@solana/web3.js")
const { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount } = require('@solana/spl-token')
const idl = require("../../utils/idl/pool.json")
const address = require("../../utils/address.json")

async function main() {
    const connection = new web3.Connection(process.env.RPC_URL)
    const secretKey = Buffer.from(JSON.parse(process.env.SECRET_KEY))
    const wallet = new anchor.Wallet(web3.Keypair.fromSecretKey(secretKey))
    const confirmOpts = {
        preflightCommitment: "recent",
        commitment: "recent",
    }
    const provider = new anchor.AnchorProvider(connection, wallet, confirmOpts)
    const programId = new web3.PublicKey(idl.metadata.address)
    const program = new anchor.Program(idl, programId, provider)

    // Get the cover product address
    const product = address.products["1"]
    // Create or get the associate token account address from the LP token
    const stakerIndividualPoolLpAta = await getOrCreateAssociatedTokenAccount(connection, wallet.payer, new web3.PublicKey(product.individualPoolLpAuwtMint), wallet.publicKey)
    // Get the user state account pda for storing user state
    const [stakerStateAccountPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(address.poolProgramMetadataState.slice(0, 32)),
        Buffer.from(product.individualPoolStatePda.slice(0, 32)),
        Buffer.from(anchor.utils.bytes.utf8.encode("staker_state_seed")),
        Buffer.from(wallet.payer.publicKey.toBytes().slice(0, 32))
      ],
      program.programId
    )
    const stakedAuwtAmount = 1 * 10 ** 9
    const auwtTokenAccount = await getOrCreateAssociatedTokenAccount(connection, wallet.payer, new web3.PublicKey(address.auwtMint), wallet.publicKey)
    const tx = await program.methods.stakeToIndividualPool(new anchor.BN(stakedAuwtAmount))
        .accounts({
            programMetadataState: address.poolProgramMetadataState,
            individualPoolState: product.individualPoolStatePda,
            individualPoolAuwtTokenAccount: product.individualPoolAuwtTokenAccount,
            individualPoolLpAuwtMintAuthPda: product.individualPoolLpAuwtMintAuthPda,
            individualPoolLpAuwtMint: product.individualPoolLpAuwtMint,
            auwtState: address.auwtState,
            poolCpiAuthPda: address.poolCpiAuthPda,
            staker: wallet.payer.publicKey,
            stakerState: stakerStateAccountPda,
            stakerAuwtAccount: auwtTokenAccount.address,
            stakerLpAuwtAccount: stakerIndividualPoolLpAta.address,
            sysvarRent: anchor.web3.SYSVAR_RENT_PUBKEY,
            sysvarClock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
            tokenProgram: TOKEN_PROGRAM_ID,
            auwtProgram: address.Programs.AuwtTokenProgram,
            systemProgram: anchor.web3.SystemProgram.programId
        })
        .signers([wallet.payer])
        .rpc()
    console.log("Your transaction 'stakeToIndividualPool' signature: ", tx)
}

main()