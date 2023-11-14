import yargs from "yargs/yargs.js";
import {
  execute_query,
  retrieve_query_result,
  display_error
} from "../lib/zksql/queries/index.js";

import {
  Account,
  AleoKeyProvider,
  AleoNetworkClient,
  NetworkRecordProvider,
  ProgramManager,
} from "@aleohq/sdk";
import dotenv from 'dotenv';
import path from 'path';


dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });


const load_context = (argv) => {
  let context = {};
  const endpoint = argv?.endpoint ? argv.endpoint : process.env.NETWORK_API_URL;
  context.endpoint = endpoint;
  try {
    const account =
      argv?.privateKey ?
        new Account({ privateKey: argv.privateKey })
        : process.env.PRIVATE_KEY ?
          new Account({ privateKey: process.env.PRIVATE_KEY })
          : null;
    const verbosity =
      argv?.verbosity ?
        Number(argv.verbosity)
        : process.env.VERBOSITY ?
          Number(process.env.VERBOSITY)
          : 1;

    const keyProvider = new AleoKeyProvider();
    keyProvider.useCache(true);
    const networkClient = new AleoNetworkClient(endpoint);
    const recordProvider = new NetworkRecordProvider(account, networkClient);

    const programManager = new ProgramManager(endpoint, keyProvider, recordProvider);
    programManager.setAccount(account)

    context = {
      ...context,
      account,
      verbosity,
      keyProvider,
      networkClient,
      recordProvider,
      programManager
    };

  } catch (e) {
    throw new Error("Failed to load private key.")
  }
  if (!context.account)
    throw new Error("No private key provided. Use --privateKey or set PRIVATE_KEY env variable.")

  global.context = context;
}

const optional_args_pattern = `--privateKey <privateKey> --verbosity <verbosity: 0, 1 (default), 2>`;

const execute_action = "execute";
const result_action = "result";
const help_message = `
Usage: zksql <action> ${optional_args_pattern}

Available actions:
- '${execute_action}': execute a zkSQL query.
- '${result_action}': retrieve result from a zkSQL query.
`;

const default_entrypoint = (argv) => {
  if (!actions.includes(argv?._?.[0])) {
    return console.log(help_message);
  }
};


const execute_arg_name = "query";
const execute_cmd_pattern = `${execute_action} <${execute_arg_name}>`;
const execute_help_message = `
Execute a zkSQL query.

Usage: zksql ${execute_cmd_pattern} ${optional_args_pattern}
`;

const execute_entrypoint = async ({ argv }) => {
  load_context(argv);
  const query = argv?._?.[1];

  if (!query) {
    return console.log(execute_help_message);
  }
  try {
    await execute_query(query);
  } catch (e) {
    console.log(e)
  }
};


const result_arg_name = "requestId";
const result_cmd_pattern = `${result_action} <${result_arg_name}>`;
const result_help_message = `
Retrieve result from a zkSQL query.

Usage: zksql ${result_cmd_pattern} ${optional_args_pattern}
`;

const result_entrypoint = async ({ argv }) => {
  load_context(argv);
  const query_id = argv?._?.[1];

  if (!query_id) {
    return console.log(result_help_message);
  }
  try {
    await retrieve_query_result(query_id);
  } catch (e) {
    display_error(e);
  }
};

const actions = [
  execute_action,
];

const argv = yargs(process.argv.slice(2))
  .command('$0', 'help', () => { }, default_entrypoint)
  .command(
    execute_cmd_pattern,
    execute_help_message,
    execute_entrypoint
  )
  .command(
    result_cmd_pattern,
    result_help_message,
    result_entrypoint
  )
  .argv;


