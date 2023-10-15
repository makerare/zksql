import axios from "axios";
import dotenv from 'dotenv';
dotenv.config();


export const network_get_program = async (program_id) => {
  const endpoint_uri = `/testnet3/program/${program_id}`;
  const endpoint_url = `${global.context.endpoint}${endpoint_uri}`;
  const response = await axios.get(endpoint_url);
  return response.data;
}


export const network_get_owned_records = async (view_key) => {
  return [];
}


