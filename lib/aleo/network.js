import dotenv from 'dotenv';
dotenv.config();


export const network_get_program = async (program_id) => {
  const endpoint_uri = `/testnet3/program/${program_id}`;
  const endpoint_url = `${global.context.endpoint}${endpoint_uri}`;

  try {
    if (program_id === 'first_table.aleo')
      return `
program first_table.aleo;

struct RowData_first_table:
    column1 as field;
    column2 as boolean;

record Row_first_table:
    owner as address.private;
    data as RowData_first_table.private;

function insert_first_table:
    input r0 as RowData_first_table.private;
    cast self.signer r0 into r1 as Row_first_table.record;
    output r1 as Row_first_table.record;

function update_first_table:
    input r0 as Row_first_table.record;
    input r1 as RowData_first_table.private;
    cast self.signer r1 into r2 as Row_first_table.record;
    output r2 as Row_first_table.record;

function delete_first_table:
    input r0 as Row_first_table.record;
`;

    const req = new Request(endpoint_url);
    const res = await fetch(req);
    if (!res.ok) {
      throw Error(await res.text());
    }
    const text = await res.json();
    return text;
  } catch (e) {
    console.log(e)
    throw Error(e?.response?.data || "Could not fetch program.");
  }
}


export const network_get_owned_records = async (view_key) => {
  return [];
}


export const network_deploy_program = async (program_id, program_code) => {
  console.log(`Deploying program '${program_id}'.`);

  const fee = 5;
  const tx_id = await global.context.programManager.deploy(program_code, fee);
  console.log(
    `Program deployed with transaction id: ${tx_id}.`
  );
  const transaction = await check_transaction_status(tx_id);
  console.log(transaction);

  return tx_id;
}


export const network_execute_program = async (
  program_id,
  transition_name,
  args
) => {
  const fee = 5;
  const tx_id = await global.context.programManager.execute(
    program_id,
    transition_name,
    fee,
    args
  );
  console.log(
    `Transition executed with id: ${tx_id}.`
  );
  const transaction = await check_transaction_status(tx_id);
  console.log(transaction);

  return tx_id;
}


const check_transaction_status = async (tx_id) => {
  console.log(
    `Checking transation status...`
  );
  const dt = 5_000;
  let succes = false;
  for (let i = 0; i < Number(process.env.TRANSACTION_TIMEOUT_MS) / dt; i++) {
    try {
      await global
        .context
        .programManager
        .networkClient
        .getTransaction(tx_id);
      succes = true;
      break;
    } catch (e) {
      await new Promise((r) => setTimeout(r, Number(dt)));
    }
  }
  if (!succes)
    throw Error("Transaction status check timed out.");
}


export const network_get_records = async (program_id) => {
  return await global.context.recordProvider.findRecords(true, null, {
    startHeight: null,
    endHeight: null,
    amount: null,
    maxRecords: null,
    programName: program_id,
    recordName: null,
  });
}