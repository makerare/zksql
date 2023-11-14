import { Program } from '../../aleo/program.js';
import { load_type } from '../../aleo/types/index.js';

export const retrieve_query_result = async (query_id) => {
    //const program = await (new Program(query_id)).load();
    const code = `
import test.aleo;
program nft_market_place_atom_v3.aleo;

record token:
    owner as address.private;
    amount as u64.private;

struct String64:
    part0 as u128.public;
    part1 as u128.public;
    part2 as u128.public;
    part3 as u128.public;
    part4 as u128.public;
    part5 as u128.public;

struct NFT:
    uri as String64.public;

mapping account:
    key as address;
    value as u64;

mapping tokenExists:
    key as u128;
    value as boolean;

mapping publicNftData:
    key as u128;
    value as NFT;

mapping publicNftOwners:
    key as u128;
    value as address;

function mint_nft_public:
    input r0 as u128.public;
    input r1 as String64.public;
    async mint_nft_public self.caller r0 r1 into r2;
    output r2 as nft_market_place_atom_v3.aleo/mint_nft_public.future;
finalize mint_nft_public:
    input r0 as address;
    input r1 as u128;
    input r2 as String64;
    cast r2 into r3 as NFT;
    contains tokenExists[r1] into r4;
    not r4 into r5;
    assert_eq r5 true;
    set r3 into publicNftData[r1];
    set r0 into publicNftOwners[r1];
    set true into tokenExists[r1];

function mint_token_public:
    input r0 as address.public;
    input r1 as u64.public;
    async mint_token_public r0 r1 into r2;
    output r2 as nft_market_place_atom_v3.aleo/mint_token_public.future;
finalize mint_token_public:
    input r0 as address;
    input r1 as u64;
    get.or_use account[r0] 0u64 into r2;
    add r2 r1 into r3;
    set r3 into account[r0];

function mint_token_private:
    input r0 as address.private;
    input r1 as u64.private;
    cast r0 r1 into r2 as token.record;
    output r2 as token.record;

function burn_token_public:
    input r0 as u64.public;
    async burn_token_public self.caller r0 into r1;
    output r1 as nft_market_place_atom_v3.aleo/burn_token_public.future;
finalize burn_token_public:
    input r0 as address;
    input r1 as u64;
    get.or_use account[r0] 0u64 into r2;
    sub r2 r1 into r3;
    set r3 into account[r0];

function transfer_token_public:
    input r0 as address.public;
    input r1 as u64.public;
    async transfer_token_public self.caller r0 r1 into r2;
    output r2 as nft_market_place_atom_v3.aleo/transfer_token_public.future;
finalize transfer_token_public:
    input r0 as address;
    input r1 as address;
    input r2 as u64;
    get.or_use account[r0] 0u64 into r3;
    sub r3 r2 into r4;
    set r4 into account[r0];
    get.or_use account[r1] 0u64 into r5;
    add r5 r2 into r6;
    set r6 into account[r1];

function transfer_token_private:
    input r0 as token.record;
    input r1 as address.private;
    input r2 as u64.private;
    sub r0.amount r2 into r3;
    cast r0.owner r3 into r4 as token.record;
    cast r1 r2 into r5 as token.record;
    output r4 as token.record;
    output r5 as token.record;
  `;
    const program = Program.from_code(code);
    console.log(program.code);
    return;
};