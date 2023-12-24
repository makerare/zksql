program homomorphic.aleo;
// https://andrea.corbellini.name/2023/01/02/ec-encryption/

struct Encrypted:
    c as group;
    d as group;


function test_secret_to_public_key:
    input r0 as scalar.private;

    call secret_to_public_key r0 into r1;

    output r1 as group.private;


function egec_encrypt_u64: // Non-homomorphic encryption of a u64
    input r0 as u64.private; // Value to encrypt 
    input r1 as field.private; // Encoding Pad
    input r2 as group.private; // Public Key
    input r3 as scalar.private; // Random encryption Pad

    call encode_u64_to_group r0 r1 into r4;
    
    call egec_encrypt_group r4 r2 r3 into r5;

    output r5 as Encrypted.private;


function egec_decrypt_u64:
    input r0 as Encrypted.private;
    input r1 as scalar.private; // Secret key

    call egec_decrypt_group r0 r1 into r2;

    call decode_group_to_u64 r2 into r3;

    output r3 as u64.private;


function h_egec_encrypt_u16: // Homomorphic encryption of a u16
    input r0 as u16.private; // Value to encrypt 
    input r1 as group.private; // Public Key
    input r2 as scalar.private; // Random encryption Pad

    call h_encode_u16_to_group r0 into r3;

    call egec_encrypt_group r3 r1 r2 into r4;

    output r4 as Encrypted.private;


function h_egec_decrypt_u16: // Decoding O(sqrt(N)) : https://en.wikipedia.org/wiki/Baby-step_giant-step
    input r0 as Encrypted.private;
    input r1 as scalar.private; // Secret key

    call egec_decrypt_group r0 r1 into r2;

    output r2 as group.private;


function h_egec_encrypt_u32: // Homomorphic encryption of a u32
    input r0 as u32.private; // Value to encrypt 
    input r1 as group.private; // Public Key
    input r2 as [scalar; 4u32].private; // Random encryption Pads

    call unpack_u32_into_u8s_as_u16s r0 into r3;

    call h_encode_u16_to_group r3[0u32] into r4;
    call h_encode_u16_to_group r3[1u32] into r5;
    call h_encode_u16_to_group r3[2u32] into r6;
    call h_encode_u16_to_group r3[3u32] into r7;

    call egec_encrypt_group r4 r1 r2[0u32] into r8;
    call egec_encrypt_group r5 r1 r2[1u32] into r9;
    call egec_encrypt_group r6 r1 r2[2u32] into r10;
    call egec_encrypt_group r7 r1 r2[3u32] into r11;

    cast r8 r9 r10 r11 into r12 as [Encrypted; 4u32];

    output r12 as [Encrypted; 4u32].private;


function h_egec_decrypt_u32:
    input r0 as [Encrypted; 4u32].private;
    input r1 as scalar.private; // Secret key

    call egec_decrypt_group r0[0u32] r1 into r2;
    call egec_decrypt_group r0[1u32] r1 into r3;
    call egec_decrypt_group r0[2u32] r1 into r4;
    call egec_decrypt_group r0[3u32] r1 into r5;

    cast r2 r3 r4 r5 into r6 as [group; 4u32];

    output r6 as [group; 4u32].private;


function h_egec_encrypt_u64: // Homomorphic encryption of a u64
    input r0 as u64.private; // Value to encrypt 
    input r1 as group.private; // Public Key
    input r2 as [scalar; 8u32].private; // Random encryption Pads

    call unpack_u64_into_u8s_as_u16s r0 into r3;

    call h_encode_u16_to_group r3[0u32] into r4;
    call h_encode_u16_to_group r3[1u32] into r5;
    call h_encode_u16_to_group r3[2u32] into r6;
    call h_encode_u16_to_group r3[3u32] into r7;
    call h_encode_u16_to_group r3[4u32] into r8;
    call h_encode_u16_to_group r3[5u32] into r9;
    call h_encode_u16_to_group r3[6u32] into r10;
    call h_encode_u16_to_group r3[7u32] into r11;

    call egec_encrypt_group r4 r1 r2[0u32] into r12;
    call egec_encrypt_group r5 r1 r2[1u32] into r13;
    call egec_encrypt_group r6 r1 r2[2u32] into r14;
    call egec_encrypt_group r7 r1 r2[3u32] into r15;
    call egec_encrypt_group r8 r1 r2[4u32] into r16;
    call egec_encrypt_group r9 r1 r2[5u32] into r17;
    call egec_encrypt_group r10 r1 r2[6u32] into r18;
    call egec_encrypt_group r11 r1 r2[7u32] into r19;

    cast r12 r13 r14 r15 r16 r17 r18 r19 into r20 as [Encrypted; 8u32];

    output r20 as [Encrypted; 8u32].private;


function h_egec_decrypt_u64:
    input r0 as [Encrypted; 8u32].private;
    input r1 as scalar.private; // Secret key

    call egec_decrypt_group r0[0u32] r1 into r2;
    call egec_decrypt_group r0[1u32] r1 into r3;
    call egec_decrypt_group r0[2u32] r1 into r4;
    call egec_decrypt_group r0[3u32] r1 into r5;
    call egec_decrypt_group r0[4u32] r1 into r6;
    call egec_decrypt_group r0[5u32] r1 into r7;
    call egec_decrypt_group r0[6u32] r1 into r8;
    call egec_decrypt_group r0[7u32] r1 into r9;

    cast r2 r3 r4 r5 r6 r7 r8 r9 into r10 as [group; 8u32];
    
    output r10 as [group; 8u32].private;


function test_sum_encrypted:
    input r0 as Encrypted.private;
    input r1 as Encrypted.private;

    call sum_encrypted r0 r1 into r2;

    output r2 as Encrypted.private;


function test_sum_encrypted_u32:
    input r0 as [Encrypted; 4u32].private;
    input r1 as [Encrypted; 4u32].private;

    call sum_encrypted_u32 r0 r1 into r2;

    output r2 as [Encrypted; 4u32].private;


function test_sum_encrypted_u64:
    input r0 as [Encrypted; 8u32].private;
    input r1 as [Encrypted; 8u32].private;

    call sum_encrypted_u64 r0 r1 into r2;

    output r2 as [Encrypted; 8u32].private;



function sub_groups:
    input r0 as group.private;
    input r1 as group.private;

    sub r0 r1 into r2;

    output r2 as group.private;


closure secret_to_public_key:
    input r0 as scalar;

    mul r0 group::GEN into r1;

    output r1 as group;


closure h_encode_u16_to_group:
    input r0 as u16;

    cast r0 into r1 as scalar;
    mul r1 group::GEN into r2;

    output r2 as group;


closure unpack_u32_into_u8s_as_u16s:
    input r0 as u32;

    cast.lossy r0 into r1 as u8;
    cast r1 into r2 as u16;

    shr r0 8u16 into r3;
    cast.lossy r3 into r4 as u8;
    cast r4 into r5 as u16;

    shr r3 8u16 into r6;
    cast.lossy r6 into r7 as u8;
    cast r7 into r8 as u16;

    shr r6 8u16 into r9;
    cast.lossy r9 into r10 as u8;
    cast r10 into r11 as u16;

    cast r2 r5 r8 r11 into r12 as [u16; 4u32];

    output r12 as [u16; 4u32];


closure unpack_u64_into_u8s_as_u16s:
    input r0 as u64;

    cast.lossy r0 into r1 as u8;
    cast r1 into r2 as u16;

    shr r0 8u16 into r3;
    cast.lossy r3 into r4 as u8;
    cast r4 into r5 as u16;

    shr r3 8u16 into r6;
    cast.lossy r6 into r7 as u8;
    cast r7 into r8 as u16;

    shr r6 8u16 into r9;
    cast.lossy r9 into r10 as u8;
    cast r10 into r11 as u16;

    shr r9 8u16 into r12;
    cast.lossy r12 into r13 as u8;
    cast r13 into r14 as u16;

    shr r12 8u16 into r15;
    cast.lossy r15 into r16 as u8;
    cast r16 into r17 as u16;

    shr r15 8u16 into r18;
    cast.lossy r18 into r19 as u8;
    cast r19 into r20 as u16;

    shr r18 8u16 into r21;
    cast.lossy r21 into r22 as u8;
    cast r22 into r23 as u16;

    cast r2 r5 r8 r11 r14 r17 r20 r23 into r24 as [u16; 8u32];

    output r24 as [u16; 8u32];


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

    cast r3 r5 into r6 as Encrypted;

    output r6 as Encrypted;


closure egec_decrypt_group:
    input r0 as Encrypted;
    input r1 as scalar; // secret key

    mul r0.c r1 into r2;
    sub r0.d r2 into r3;

    output r3 as group;


closure sum_encrypted_u32:
    input r0 as [Encrypted; 4u32];
    input r1 as [Encrypted; 4u32];

    add r0[0u32].c r1[0u32].c into r2;
    add r0[0u32].d r1[0u32].d into r3;
    cast r2 r3 into r4 as Encrypted;

    add r0[1u32].c r1[1u32].c into r5;
    add r0[1u32].d r1[1u32].d into r6;
    cast r5 r6 into r7 as Encrypted;

    add r0[2u32].c r1[2u32].c into r8;
    add r0[2u32].d r1[2u32].d into r9;
    cast r8 r9 into r10 as Encrypted;

    add r0[3u32].c r1[3u32].c into r11;
    add r0[3u32].d r1[3u32].d into r12;
    cast r11 r12 into r13 as Encrypted;

    cast r4 r7 r10 r13 into r14 as [Encrypted; 4u32];

    output r14 as [Encrypted; 4u32];


closure sum_encrypted_u64:
    input r0 as [Encrypted; 8u32];
    input r1 as [Encrypted; 8u32];

    add r0[0u32].c r1[0u32].c into r2;
    add r0[0u32].d r1[0u32].d into r3;
    cast r2 r3 into r4 as Encrypted;

    add r0[1u32].c r1[1u32].c into r5;
    add r0[1u32].d r1[1u32].d into r6;
    cast r5 r6 into r7 as Encrypted;

    add r0[2u32].c r1[2u32].c into r8;
    add r0[2u32].d r1[2u32].d into r9;
    cast r8 r9 into r10 as Encrypted;

    add r0[3u32].c r1[3u32].c into r11;
    add r0[3u32].d r1[3u32].d into r12;
    cast r11 r12 into r13 as Encrypted;

    add r0[4u32].c r1[4u32].c into r14;
    add r0[4u32].d r1[4u32].d into r15;
    cast r14 r15 into r16 as Encrypted;

    add r0[5u32].c r1[5u32].c into r17;
    add r0[5u32].d r1[5u32].d into r18;
    cast r17 r18 into r19 as Encrypted;

    add r0[6u32].c r1[6u32].c into r20;
    add r0[6u32].d r1[6u32].d into r21;
    cast r20 r21 into r22 as Encrypted;

    add r0[7u32].c r1[7u32].c into r23;
    add r0[7u32].d r1[7u32].d into r24;
    cast r23 r24 into r25 as Encrypted;

    cast r4 r7 r10 r13 r16 r19 r22 r25 into r26 as [Encrypted; 8u32];

    output r26 as [Encrypted; 8u32];


closure sum_encrypted:
    input r0 as Encrypted;
    input r1 as Encrypted;

    add r0.c r1.c into r2;
    add r0.d r1.d into r3;

    cast r2 r3 into r4 as Encrypted;

    output r4 as Encrypted;

