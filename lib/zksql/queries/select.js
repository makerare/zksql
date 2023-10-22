import {
    get_tables_from_parsed_tables,
    get_columns_from_parsed_columns
} from "../sql/table.js";
import { network_get_records } from "../../aleo/network.js";

export const execute_select_query = async (query) => {
    const froms = await get_tables_from_parsed_tables(query?.from);
    const columns = get_columns_from_parsed_columns(query.columns, froms);



    // const code = program_code_from_select(columns, query);
    //const program = await deploy_program(code);

    // console.log(query.from[1].on);
}
