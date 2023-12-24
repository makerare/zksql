// Execting :
// SELECT t2.col_2_1 as col1, t3.col_3_1 as col2, t2.col_2_3 as col3
// FROM aleo15epz3ejthprc70qyctnl5q4qtfjaparsfnwg7rm90v5gvtv2mvqq4n6kxj.table2 as t2
// JOIN aleo12z0zjgct2xys56z5k83n442fjtcyrnfjhnkvaldhp8e0qafssc9smytex2.table3 as t3
// ON t2.col_2_1 = t3.col_2_1

// If a field is not used, it is not included in the struct D000_njfgxxgjiqiceeavgt3djc6rv
// If it is used in SELECT projection, it is encrypted in the struct D000_njfgxxgjiqiceeavgt3djc6rv with receiver public key
// If it is used in JOIN ON, it is included in the struct D000_njfgxxgjiqiceeavgt3djc6rv as a hash


import table2.aleo;
import table3.aleo;

program njfgxxgjiqiceeavgt3djc6rv.aleo;


struct Ciphertext:
    nonce as group;
    data as field;

struct AddHomCiphertext:
    c as group;
    d as group;

struct MulHomoCiphertext:
    c as field;
    d as field;

struct Desc_njfgxxgjiqiceeavgt3djc6rv:
    col1 as field;
    col2 as field;
    col3 as boolean;

struct Desc_table2:
    col_2_1 as field;
    col_2_2 as field;
    col_2_3 as boolean;

struct Desc_table3:
    col_3_1 as field;
    col_2_1 as field;

struct D000_njfgxxgjiqiceeavgt3djc6rv:
    d0 as field;

struct Aggr_njfgxxgjiqiceeavgt3djc6rv:
    a1 as field;

record Row_njfgxxgjiqiceeavgt3djc6rv:
    owner as address.private;
    data as Desc_njfgxxgjiqiceeavgt3djc6rv.private;

record I000_njfgxxgjiqiceeavgt3djc6rv:
    owner as address.private;
    data as D000_njfgxxgjiqiceeavgt3djc6rv.private;

record RqC_njfgxxgjiqiceeavgt3djc6rv:
    owner as address.private;
    aggregate as Aggr_njfgxxgjiqiceeavgt3djc6rv.private;
    current_rows_hash as u64.private;
    current_inters_hash as u64.private;

record RqF_njfgxxgjiqiceeavgt3djc6rv:
    owner as address.private;
    final_rows_hash as u64.private;
    final_inters_hash as u64.private;

function init_njfgxxgjiqiceeavgt3djc6rv:
    assert_eq self.caller aleo1wamjqlka7d0gazlxdys6n8e8zeee3ymedwvw8elvh7529kwd45rq0plgax;
    cast 0field into r1 as Aggr_njfgxxgjiqiceeavgt3djc6rv;
    cast aleo15epz3ejthprc70qyctnl5q4qtfjaparsfnwg7rm90v5gvtv2mvqq4n6kxj r1 0field 0field into r2 as RqC_njfgxxgjiqiceeavgt3djc6rv.record;
    cast aleo15epz3ejthprc70qyctnl5q4qtfjaparsfnwg7rm90v5gvtv2mvqq4n6kxj 0field 0field into r3 as RqF_njfgxxgjiqiceeavgt3djc6rv.record;
    output r2 as RqC_njfgxxgjiqiceeavgt3djc6rv.record;
    output r3 as RqF_njfgxxgjiqiceeavgt3djc6rv.record;

function p000_njfgxxgjiqiceeavgt3djc6rv:
    input r0 as table2.aleo/Row_table2.record;
    input r1 as RqC_njfgxxgjiqiceeavgt3djc6rv.record;
    assert_eq self.caller aleo15epz3ejthprc70qyctnl5q4qtfjaparsfnwg7rm90v5gvtv2mvqq4n6kxj;
    cast r0.col_2_1 into r1 as D000_njfgxxgjiqiceeavgt3djc6rv;
    cast aleo1wamjqlka7d0gazlxdys6n8e8zeee3ymedwvw8elvh7529kwd45rq0plgax r1.data into r2 as Row_njfgxxgjiqiceeavgt3djc6rv.record;
    output r2 as Row_njfgxxgjiqiceeavgt3djc6rv.record;

function p001_njfgxxgjiqiceeavgt3djc6rv:
    input r0 as first_table.aleo/Row_first_table.record;
    input r1 as I000_njfgxxgjiqiceeavgt3djc6rv.record;
    input r2 as Req_njfgxxgjiqiceeavgt3djc6rv.record;
    hash.bhp256 r1.data into r3 as scalar;
    commit.bhp256 r2.current_rows_hash r3 into r4 as field;
    cast self.caller r2.aggregate r2.final_rows_hash r4 into as Req_njfgxxgjiqiceeavgt3djc6rv.record;

function end_njfgxxgjiqiceeavgt3djc6rv:
    assert_eq self.caller aleo15epz3ejthprc70qyctnl5q4qtfjaparsfnwg7rm90v5gvtv2mvqq4n6kxj;
    cast aleo1wamjqlka7d0gazlxdys6n8e8zeee3ymedwvw8elvh7529kwd45rq0plgax into r0 as Done_njfgxxgjiqiceeavgt3djc6rv.record;
    output r0 as Done_njfgxxgjiqiceeavgt3djc6rv.record;

closure encode_field_to_group:
    input r0 as field; // Field value to encode
    cast r0 into r1 as scalar;
    mul r1 group::GEN into r2;
    output r2 as group;

closure egec_encrypt_group:
    input r0 as group; // Value to encrypt encoded as group
    input r1 as group; // Public Key
    input r2 as scalar; // Random Pad
    mul r2 group::GEN into r3;
    mul r3 r2 into r4;
    add r4 r0 into r5;
    cast r3 r5 into r6 as EncryptedValue;
    output r6 as EncryptedValue;

closure egec_encrypt_field:
    input r0 as field; // Value to encrypt encoded as field
    input r1 as group; // Public Key
    input r2 as scalar; // Random Pad
    call encode_field_to_group r0 into r3;
    call egec_encrypt_group r3 r1 r2 into r4;
    output r4 as EncryptedValue;

closure egec_decrypt_to_group:
    input r0 as EncryptedValue;
    input r1 as scalar; // secret key
    mul r0.c r1 into r2;
    sub r0.d r2 into r3;
    output r3 as group;
