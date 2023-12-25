program table2.aleo;

struct Desc_table2:
    col2_1 as field;
    col_2_2 as field;
    col_2_3 as boolean;

record Row_table2:
    owner as address.private;
    data as Desc_table2.private;

function create_table2:
    input r0 as Desc_table2.private;
    cast self.caller r0 into r1 as Row_table2;
    output r1 as Row_table2.record;

function update_table2:
    input r0 as Row_table2.record;
    input r1 as Desc_table2.private;
    cast self.caller r1 into r2 as Row_table2;
    output r2 as Row_table2.record;

function delete_table2:
    input r0 as Row_table2.record;

