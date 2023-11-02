import { Program } from '../../aleo/program.js';

import { load_type } from '../../aleo/types/index.js';

export const retrieve_query_result = async (query_id) => {
  //const program = await (new Program(query_id)).load();
  console.log(load_type(query_id));
  return;
};