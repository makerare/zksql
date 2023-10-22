import { AleoNetworkClient, NetworkRecordProvider, ProgramManager, AleoKeyProvider } from '@aleohq/sdk';

import axios from "axios";
import dotenv from 'dotenv';
dotenv.config();


export const network_get_program = async (program_id) => {
  const endpoint_uri = `/testnet3/program/${program_id}`;
  const endpoint_url = `${global.context.endpoint}${endpoint_uri}`;
  try {
    return (
      await axios.get(endpoint_url)
    ).data;
  } catch (e) {
    throw Error(e?.response?.data || "Could not fetch program.");
  }
}


export const network_get_owned_records = async (view_key) => {
  return [];
}


export const network_deploy_program = async (program_id, program_code) => {
  console.log(`Deploying program '${program_id}'.`);

  const account = global.context.account;
  const endpoint = global.context.endpoint;
  const keyProvider = new AleoKeyProvider();
  keyProvider.useCache(true);
  const networkClient = new AleoNetworkClient(endpoint);

  const recordProvider = new NetworkRecordProvider(account, networkClient);
  const programManager = new ProgramManager(endpoint, keyProvider, recordProvider);
  programManager.setAccount(account)

  const fee = 5;

  const tx_id = await programManager.deploy(program_code, fee);
  console.log(`Program deployed with transaction id: ${tx_id}.`);
  const transaction = await programManager.networkClient.getTransaction(tx_id);
  console.log(transaction);
  return tx_id;
}