import { Program } from '../../aleo/program.js';

export const retrieve_query_result = async (query_id) => {
  const program = await (new Program(query_id)).load();
  return;
};