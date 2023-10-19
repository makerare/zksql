import { Table } from '../sql/table.js';


export const execute_insert_query = async (query) => {
  const table = await Table.from_parsed_table(query?.table?.[0]);
  await table.insert(query);
}
