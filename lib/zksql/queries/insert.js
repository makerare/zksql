import { Table } from '../sql/table.js';


export const execute_insert_query = async (query) => {
  const query_table = query?.table?.[0];
  if (!query_table?.table) {
    throw Error("No table specified.");
  }
  const table = await Table.from_parsed_table(query_table);
  await table.insert(query);
}
