import yargs from "yargs/yargs.js";
import { execute_query } from "../lib/zksql/queries/index.js";

import { Account } from "@aleohq/sdk";
import dotenv from 'dotenv';
dotenv.config();


const load_context = (argv) => {
  const context = {};
  context.endpoint = argv?.endpoint ? argv.endpoint : process.env.NETWORK_API_URL;

  try {
    context.account =
      argv?.privateKey ?
        new Account({ privateKey: argv.privateKey })
        : process.env.PRIVATE_KEY ?
          new Account({ privateKey: process.env.PRIVATE_KEY })
          : null;
  } catch (e) {
    throw new Error("Failed to load private key.")
  }
  if (!context.account)
    throw new Error("No private key provided. Use --privateKey or set PRIVATE_KEY env variable.")

  global.context = context;
}


const execute_action = "execute";
const help_message = `
Usage: zksql <action>

Action to perform:
- ${execute_action}: execute a zkSQL query.
`;

const default_entrypoint = (argv) => {
  if (!actions.includes(argv?._?.[0])) {
    return console.log(help_message);
  }
};

const execute_arg_name = "query";
const execute_cmd_pattern = `${execute_action} <${execute_arg_name}>`;
const help_execute_message = `
Usage: zksql ${execute_action} <${execute_arg_name}> --privateKey <privateKey>
${execute_action} <${execute_arg_name}> execute the query.
`;

const execute_entrypoint = async ({ argv }) => {
  load_context(argv);
  const query = argv?._?.[1];

  if (!query) {
    return console.log(help_execute_message);
  }
  try {
    await execute_query(query);
  } catch (e) {
    console.log(e)
  }
};


const actions = [
  execute_action,
];

const argv = yargs(process.argv.slice(2))
  .command('$0', 'help', () => { }, default_entrypoint)
  .command(
    execute_cmd_pattern,
    help_execute_message,
    execute_entrypoint
  )
  .argv;


