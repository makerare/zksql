program homomorphic.aleo;


struct EncryptedValue:
   c as group;
   d as group;





function test_secret_to_public_key:
   input r0 as scalar.private;
   call secret_to_public_key r0 into r1;
   output r1 as group.private;

function test_sum_encrypted_values:
    input r0 as EncryptedValue.private;
    input r1 as EncryptedValue.private;
    call sum_encrypted_values r0 r1 into r2;
    output r2 as EncryptedValue.private;

function test_encode_u64_to_group:
    input r0 as u64.private;
    input r1 as field.private;
    call encode_u64_to_group r0 r1 into r2;
    output r2 as group.private;

function test_h_encode_u16_to_group:
    input r0 as u16.private;
    call h_encode_u16_to_group r0 into r1;
    output r1 as group.private;

function h_egec_encrypt_u16:
    input r0 as u16.private; // Value to encrypt 
    input r1 as group.private; // Public Key
    input r2 as scalar.private; // Random encryption Pad
    call h_encode_u16_to_group r0 into r3;
    call egec_encrypt_group r3 r1 r2 into r4;
    output r4 as EncryptedValue.private;

function h_egec_decrypt_u16:
   input r0 as EncryptedValue.private;
   input r1 as scalar.private; // Secret key
   call egec_decrypt_group r0 r1 into r2;
   output r2 as group.private;

function egec_encrypt_u64:
    input r0 as u64.private; // Value to encrypt 
    input r1 as field.private; // Encoding Pad
    input r2 as group.private; // Public Key
    input r3 as scalar.private; // Random encryption Pad
    call encode_u64_to_group r0 r1 into r4;
    call egec_encrypt_group r4 r2 r3 into r5;
    output r5 as EncryptedValue.private;

function egec_decrypt_u64:
   input r0 as EncryptedValue.private;
   input r1 as scalar.private; // Secret key
   call egec_decrypt_group r0 r1 into r2;
   call decode_group_to_u64 r2 into r3;
   output r3 as u64.private;

closure secret_to_public_key:
   input r0 as scalar;
   mul r0 group::GEN into r1;
   output r1 as group;

closure h_encode_u16_to_group:
    input r0 as u16; // Value to encode (u16)
    cast r0 into r1 as scalar;
    mul r1 group::GEN into r2;
    output r2 as group;

closure encode_u64_to_group:
    input r0 as u64; // Value to encode (u64)
    input r1 as field; // Encoding Pad
    mul 18446744073709551616field r1 into r2; // 64 bits shift left
    cast r0 into r3 as field;
    add r2 r3 into r4;
    cast r4 into r5 as group;
    output r5 as group;

closure decode_group_to_u64:
   input r0 as group;
   cast.lossy r0 into r1 as u64;
   output r1 as u64;

closure egec_encrypt_group:
   input r0 as group; // Value to encrypt encoded as group
   input r1 as group; // Public Key
   input r2 as scalar; // Random Pad
   mul r2 group::GEN into r3;
   mul r2 r1 into r4;
   add r4 r0 into r5;
   cast r3 r5 into r6 as EncryptedValue;
   output r6 as EncryptedValue;

closure egec_decrypt_group:
   input r0 as EncryptedValue;
   input r1 as scalar; // secret key
   mul r0.c r1 into r2;
   sub r0.d r2 into r3;
   output r3 as group;

closure sum_encrypted_values:
   input r0 as EncryptedValue;
   input r1 as EncryptedValue;
   add r0.c r1.c into r2;
   add r0.d r1.d into r3;
   cast r2 r3 into r4 as EncryptedValue;
   output r4 as EncryptedValue;


