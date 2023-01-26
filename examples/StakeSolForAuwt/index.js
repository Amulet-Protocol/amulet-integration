const anchor = require("@project-serum/anchor");
const web3 = require("@solana/web3.js");
const dotenv = require('dotenv');
dotenv.config();
const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount } = require('@solana/spl-token')
const idl = require("../../utils/idl/spl_sol_staking.json")
const address = require("../../utils/address.json")

/**
 * Stake SOL for aUWT token sample function.
 */
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
    const program = new anchor.Program(idl, programId, provider )
    // Increase the maximum compute unit
    const additionalComputeBudgetInstruction = web3.ComputeBudgetProgram.setComputeUnitLimit({
        units: 400000
    });
    // SOL is staked for amtSOL first before staked for aUWT,
    // thus an amtSOL token account is created to temporary store the staked amtSOL token.
    const amtsolTempTokenAccountKeypair = web3.Keypair.generate()
    // Create or get the associate token account address for storing aUWT token.
    const auwtTokenAccount = await getOrCreateAssociatedTokenAccount(connection, wallet.payer, new web3.PublicKey(address.auwtMint), wallet.publicKey)
     // Staking amount in SOL, here it is set as 1 SOL
    const solAmount = new anchor.BN(1 * 10**9)
     // Execute swapping SOL for aUWT token instruction
    const tx = await program.methods.mintFromSolToAuwt(solAmount).accounts({
        solstakingProgramMetadataState: address.solStakingMetadataState,
        solstakingProgramPosState: address.programPosState,
        solstakingProgramPosSolPda: address.programPosSolPda,
        solstakingProgramLiqSolPda: address.programLiqSolPda,
        solstakingProgramLiqAmtsol: address.programLiqAmtsol,
        solstakingProgramAuthPda: address.programAuthPda,
        amtsolMint: address.amtsolMint,
        splstakingProgramSummaryState: address.programSummaryState,
        splstakingProgramStakingInstanceState: address.stakingInstance.amtsolMint.programStakingInstanceState,
        splstakingProgramStakedSplTa: address.stakingInstance.amtsolMint.programStakedSplTa,
        splstakingProgramLiqStakedSplTa: address.stakingInstance.amtsolMint.programLiqStakedSplTa,
        splstakingProgramLiqAuwtTa: address.stakingInstance.amtsolMint.programLiqAuwtTa,
        splstakingProgramLiqAuwtTaAuthPda: address.stakingInstance.amtsolMint.programLiqAuwtTaAuthPda,
        exchangeRateGroupState: address.programGroupMainState,
        auwtState: address.auwtState,
        auwtMintAuthPda: address.auwtMintAuthPda,
        auwtMint: address.auwtMint,
        depositor: wallet.publicKey,
        amtsolTempTokenAccount: amtsolTempTokenAccountKeypair.publicKey,
        auwtTokenTransferTo: auwtTokenAccount.address,
        splSolStakingCallerPda: address.splSolStakingCallerPda,
        auwtProgram: address.Programs.AuwtTokenProgram,
        amuletSolStakingProgram: address.Programs.AmuletSolStakingProgram,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        sysvarRent: anchor.web3.SYSVAR_RENT_PUBKEY
    }).preInstructions([
        additionalComputeBudgetInstruction
    ]).signers([wallet.payer, amtsolTempTokenAccountKeypair]).rpc();
    console.log("Your transaction 'mintFromSolToAuwt' signature: ", tx);
}

main()