import {
  network_get_program,
  network_deploy_program,
  network_execute_program
} from './network.js';

import {
  remove_comments,
  separate_semi_colons_lines,
  load_type
} from '../utils/strings.js';


export class Program {
  name;
  imports;
  structs;
  records;
  mappings;
  closures;
  functions;
  finalizes;

  constructor(name, {
    imports = [],
    structs = [],
    records = [],
    mappings = [],
    closures = [],
    functions = [],
    finalizes = [],
  }) {
    this.name = name;
    this.imports = imports;
    this.structs = structs;
    this.records = records;
    this.mappings = mappings;
    this.closures = closures;
    this.functions = functions;
    this.finalizes = finalizes;
  }

  get id() {
    return program_name_to_id(this.name);
  }

  async deploy() {
    console.log(`Deploying '${this.id}' with code:`);
    console.log(this.code);
    return await network_deploy_program(this.id, this.code);
  }

  async call(function_name, args) {
    console.log(`Executing ${this.id}/${function_name} with args:`);
    console.log(args);
    return await network_execute_program(this.id, function_name, args);
  }

  get code() {
    return [
      ...this.imports.map(import_to_code),
      `program ${this.name};`,
      ...this.structs.map(struct_to_code),
      ...this.records.map(record_to_code),
      ...this.mappings.map(mapping_to_code),
      ...this.closures.map(closure_to_code),
      ...this.functions.map(function_to_code),
      ...this.finalizes.map(finalize_to_code),
    ].join("\n\n");
  }
}


Program.from_deployed = async function (
  program_id
) {
  const code = await network_get_program(program_id);
  const definitions = program_code_to_definitions(code);
  const program_name = program_id_to_name(program_id);
  return new Program(program_name, definitions);
};


const program_name_to_id = (name) => {
  return `${name}.aleo`;
};


const program_id_to_name = (id) => {
  return id.slice(0, -5);
}


const program_code_to_definitions = (code) => {
  const program_lines =
    separate_semi_colons_lines(
      remove_comments(code)
        .replaceAll("\n", "")
    )
      .replaceAll(":", ":\n")
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0);

  program_lines.push(null);
  const reduced = program_lines.reduce(
    program_parse_code_line,
    { blocks: [], current_block: null }
  );
  return program_blocks_to_definitions(reduced.blocks);
};


const program_parse_code_line = (context, line) => {
  const block_header = program_parse_block_header(line);
  if (block_header || (line === null && context.current_block !== null))
    context.blocks.push(context.current_block);
  if (block_header)
    context.current_block = block_header;
  else if (line !== null)
    program_block_reduce_body_line(
      context.current_block, line
    );
  return context;
}


const program_parse_block_header = (line) => {
  if (!line)
    return null;
  return (
    program_parse_import_line(line)
    ?? program_parse_struct_header_line(line)
    ?? program_parse_record_header_line(line)
    ?? program_parse_mapping_header_line(line)
    ?? program_parse_closure_header_line(line)
    ?? program_parse_function_header_line(line)
    ?? program_parse_finalize_header_line(line)
  );
}


const program_parse_import_line = (line) => {
  const regex = /^import\s+([_a-zA-Z]{1}[_a-zA-Z0-9]*)\.aleo\s*\;$/;
  const match = line.match(regex);
  if (match && match[1]) {
    return { type: "import", data: { name: match[1] } };
  }
  return null;
}


const program_parse_struct_header_line = (line) => {
  const regex = /^struct\s+([_a-zA-Z]{1}[_a-zA-Z0-9]*)\s*\:$/;
  const match = line.match(regex);
  if (match && match[1]) {
    return {
      type: "struct",
      data: {
        name: match[1],
        fields: []
      }
    };
  }
  return null;
}


const program_parse_record_header_line = (line) => {
  const regex = /^record\s+([_a-zA-Z]{1}[_a-zA-Z0-9]*)\s*\:$/;
  const match = line.match(regex);
  if (match && match[1]) {
    return {
      type: "record",
      data: {
        name: match[1],
        fields: []
      }
    };
  }
  return null;
}

const program_parse_mapping_header_line = (line) => {
  const regex = /^mapping\s+([_a-zA-Z]{1}[_a-zA-Z0-9]*)\s*\:$/;
  const match = line.match(regex);
  if (match && match[1]) {
    return {
      type: "mapping",
      data: {
        name: match[1],
        key: null,
        value: null,
      }
    };
  }
  return null;
}

const program_parse_closure_header_line = (line) => {
  const regex = /^closure\s+([_a-zA-Z]{1}[_a-zA-Z0-9]*)\s*\:$/;
  const match = line.match(regex);
  if (match && match[1]) {
    return {
      type: "closure",
      data: {
        name: match[1],
        inputs: [],
        outputs: [],
        body: []
      }
    };
  }
  return null;
}

const program_parse_function_header_line = (line) => {
  const regex = /^function\s+([_a-zA-Z]{1}[_a-zA-Z0-9]*)\s*\:$/;
  const match = line.match(regex);
  if (match && match[1]) {
    return {
      type: "function",
      data: {
        name: match[1],
        inputs: [],
        outputs: [],
        body: []
      }
    };
  }
  return null;
}


const program_parse_finalize_header_line = (line) => {
  const regex = /^finalize\s+([_a-zA-Z]{1}[_a-zA-Z0-9]*)\s*\:$/;
  const match = line.match(regex);
  if (match && match[1]) {
    return {
      type: "finalize",
      data: {
        name: match[1],
        inputs: [],
        outputs: [],
        body: []
      }
    };
  }
  return null;
}


const program_block_reduce_body_line = (block, line) => {
  try {
    program_block_reduce_body_line_throw(block, line);
  } catch (error) {
    throw new Error(
      `${error.message}\n`
      + `At '${block?.data?.name}' ${block?.type} block:\n${line}`
    );
  }
}


const program_block_reduce_body_line_throw = (block, line) => {
  return (
    (block.type === "struct") ?
      program_block_reduce_struct_body_line(block, line) :
      (block.type === "record") ?
        program_block_reduce_record_body_line(block, line) :
        (block.type === "mapping") ?
          program_block_reduce_mapping_body_line(block, line) :
          (block.type === "closure") ?
            program_block_reduce_closure_body_line(block, line) :
            (block.type === "function") ?
              program_block_reduce_function_body_line(block, line) :
              (block.type === "finalize") ?
                program_block_reduce_finalize_body_line(block, line) :
                () => { throw Error("Invalid syntax.") }
  );
}


const program_block_reduce_struct_body_line = (block, line) => {
  const as_line = program_parse_as_line(line);
  if (!as_line || as_line.identifier || as_line.type.visibility)
    throw new Error(`Invalid syntax.`);
  block.data.fields.push({
    name: as_line.name,
    type: as_line.type.name
  });
}

const program_block_reduce_record_body_line = (block, line) => {
  const as_line = program_parse_as_line(line);
  if (!as_line || as_line.identifier || !as_line.type.visibility)
    throw new Error(`Invalid syntax.`);
  block.data.fields.push({
    name: as_line.name,
    type: as_line.type
  });
}


const program_block_reduce_mapping_body_line = (block, line) => {
  const as_line = program_parse_as_line(line);
  if (!as_line || as_line.identifier)
    throw new Error(`Invalid syntax.`);
  if (as_line.type.visibility !== "public")
    throw new Error(`Mapping value must be public.`);
  if (as_line.name === "key")
    block.data.key = as_line.type.name;
  else if (as_line.name === "value")
    block.data.value = as_line.type.name;
  else
    throw new Error(`Invalid syntax.`);
}


const program_block_reduce_closure_body_line = (block, line) => {
  const as_line = program_parse_as_line(line);
  if (as_line) {
    if (!as_line.identifier || as_line.type.visibility)
      throw new Error(`Invalid syntax.`);
    if (as_line.identifier === "input")
      return block.data.inputs.push({
        name: as_line.name,
        type: as_line.type.name,
      });
    if (as_line.identifier === "output")
      return block.data.outputs.push({
        name: as_line.name,
        type: as_line.type.name,
      });
  }
  block.data.body.push(line);
}


const program_block_reduce_function_body_line = (block, line) => {
  const as_line = program_parse_as_line(line);

  if (as_line) {
    if (!as_line.identifier)
      throw new Error(`Invalid syntax.`);
    if (as_line.identifier === "input")
      return block.data.inputs.push({
        name: as_line.name,
        type: as_line.type,
      });
  }
  const output = program_parse_function_ouput_line(block, line);
  if (output)
    return block.data.outputs.push({
      name: output,
      type: block.data.inputs
    });

  block.data.body.push(line);
}

const program_parse_as_line = (line) => {
  const regex = /^([_a-zA-Z]{1}[_a-zA-Z0-9]*\s+)?([_a-zA-Z]{1}[_a-zA-Z0-9]*)\s+as\s+((?:[_a-zA-Z0-9\[\ \;\]\/]|(?:\.(?=aleo))|aleo)+)(\.(private|public|record))?\s*;$/;
  const match = line.match(regex);
  if (match && match[2] && match[3]) {
    const type = load_type(match[3]);
    if (!type)
      throw new Error(`Invalid type: '${match[3]}'.`);
    return {
      identifier: match[1] ? match[1].trim() : null,
      name: match[2],
      type: {
        name: type,
        visibility: match[4] ? match[4].slice(1) : null,
      }
    };
  }
  return null;
}


const program_parse_function_ouput_line = (line) => {
  const regex = /^output\s+([_a-zA-Z]{1}[_a-zA-Z0-9]*)\s+;$/;
  const match = line.match(regex);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}


const program_blocks_to_definitions = (blocks) => {
  const structs = [];
  const records = [];
  const imports = [];
  const functions = [];
  const finalizes = [];

  return {
    structs,
    records,
    imports,
    functions,
    finalizes
  };
};


