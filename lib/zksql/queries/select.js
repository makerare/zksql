import { get_tables_from_parsed_tables, get_columns_from_parsed_columns } from "../sql/table.js";


export const execute_select_query = async (query) => {
  const froms = await get_tables_from_parsed_tables(query?.from);
  const columns = get_columns_from_parsed_columns(query.columns, froms);
  const code = program_code_from_select(columns, query);
  //const program = await deploy_program(code);

  // console.log(query.from[1].on);
}


/*
  {
    type: 'binary_expr',
    operator: '=',
    left: { type: 'column_ref', table: null, column: 'id1' },
    right: { type: 'column_ref', table: null, column: 'id2' }
  }
*/

/* SELECT * FROM abc.disperse_multi_method
    [
        { expr: { type: 'column_ref', table: null, column: '*' }, as: null }
    ]
*/

/* SELECT a, b FROM abc.disperse_multi_method
    [
        { expr: { type: 'column_ref', table: null, column: 'a' }, as: null },
        { expr: { type: 'column_ref', table: null, column: 'b' }, as: null }
    ]
*/

/*
    [
        { expr: { type: 'column_ref', table: null, column: 'a' }, as: 'x' },
        { expr: { type: 'column_ref', table: null, column: 'b' }, as: 'y' }
    ]
*/

/*
    [
        {
            expr: { type: 'aggr_func', name: 'SUM', args: [Object], over: null },
            as: null
        }
    ]
*/