// The 'test.aleo' program.
program test.aleo;

struct array3:
    a0 as u32;
    a1 as u32;
    a2 as u32;

function hello:
input r0 as u32.public;
input r1 as u32.private;
add r0 r1 into r2;
output r2 as u32.private;
