// https://github.com/ewynx/leo-elgamal

program el_gamal.aleo;

struct Ciphertext:
    c1 as field;
    c2 as field;

function encrypt:
    input r0 as field.private;
    input r1 as field.private;
    input r2 as field.private;
    pow 22field r2 into r3;
    pow r1 r2 into r4;
    mul r0 r4 into r5;
    cast r3 r5 into r6 as Ciphertext;
    output r6 as Ciphertext.private;


function get_pub_key:
    input r0 as field.private;
    pow 22field r0 into r1;
    output r1 as field.private;


function mult_ciphertexts:
    input r0 as Ciphertext.private;
    input r1 as Ciphertext.private;
    mul r0.c1 r1.c1 into r2;
    mul r0.c2 r1.c2 into r3;
    cast r2 r3 into r4 as Ciphertext;
    output r4 as Ciphertext.private;


function decrypt:
    input r0 as Ciphertext.private;
    input r1 as field.private;
    pow r0.c1 r1 into r2;
    inv r2 into r3;
    mul r0.c2 r3 into r4;
    output r4 as field.private;