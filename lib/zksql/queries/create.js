import { Table } from '../sql/table.js';


// BIGINT", "BINARY", "BIT", "CHAR", "DATE", "DATETIME", "DECIMAL", "DOUBLE", "ENUM", "FLOAT", "GEOMETRY", "GEOMETRYCOLLECTION", "INT", "INTEGER", "JSON", "LINESTRING", "LONGTEXT", "MEDIUMINT", "MEDIUMTEXT", "MULTILINESTRING", "MULTIPOINT", "MULTIPOLYGON", "NUMERIC", "POINT", "POLYGON", "SET", "SMALLINT", "TEXT", "TIME", "TIMESTAMP", "TINYINT", "TINYTEXT", "VARBINARY", "VARCHAR", "YEAR", "blob", "boolean", "longblob", "mediumblob", "tinyblob"
const sql_to_aleo_types = {
  "INT": "field",
  "BIGINT": "field",
  "REAL": "field",
  "INTEGER": "field",
  "BOOLEAN": "boolean",
};
const supported_sql_types = Object.keys(sql_to_aleo_types);


export const execute_create_table_query = async (query) => {
  const columns = parse_query_definitions(query?.create_definitions);
  const parsed_tables = query?.table;
  if (parsed_tables?.length != 1)
    throw new Error(
      `Error: only one table can be created at once.`
    );
  const parsed_table = parsed_tables[0];
  if (parsed_table?.db)
    throw new Error(
      `Error: database cannot be specified when creating a table.`
    );
  const table_name = parsed_table?.table;
  console.log(columns)
  const table = Table.from_columns(
    global.context.account.address().to_string(),
    table_name,
    columns
  );

  const transaction_id = await table.deploy();

  console.log(`Table '${table_name}' created.`);
}


const parse_query_definitions = (definitions) => {
  if (!definitions)
    throw new Error(
      `Error: table has no columns defined.`
    );

  return definitions.map(parse_query_definition);;
}


const parse_query_definition = (definition) => {
  if (definition?.column?.type !== "column_ref")
    throw new Error(
      `Error: column ${column_name} is not a column reference.`
    );

  const column_definition = {
    attribute: definition?.column?.column,
    sql_type: definition?.definition?.dataType,
    aleo_type: sql_to_aleo_types?.[definition?.definition?.dataType],
  };

  if (!column_definition.sql_type)
    throw new Error(
      `Error: column ${column_definition.name} has no data type.`
    );
  if (!column_definition.aleo_type)
    throw new Error(
      `Error: type ${column_definition.sql_type} is not supported yet. Supported types :`
      + supported_sql_types.join(", ")
    );

  return column_definition;
}