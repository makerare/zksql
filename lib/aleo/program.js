import {
  network_get_program,
  network_deploy_program,
  network_execute_program
} from './network.js';

import {
  remove_comments
} from '../utils/strings.js';


export class Program {
  name;
  records;
  structs;
  imports;
  functions;
  finalizes;

  constructor(name, {
    records = [],
    structs = [],
    imports = [],
    functions = [],
    finalizes = []
  }) {
    this.name = name;
    this.records = records;
    this.structs = structs;
    this.imports = imports;
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
    remove_comments(code)
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
    context.current_block = program_parse_block_body(
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
    ?? program_parse_function_header_line(line)
    ?? program_parse_finalize_header_line(line)
  );
}


const program_parse_import_line = (line) => {
  const regex = /import\s+([_a-zA-Z]{1}[_a-zA-Z0-9]*)\.aleo\s+\;/;
  const match = line.match(regex);
  if (match && match[1]) {
    return { type: "import", data: { name: match[1] } };
  }
  return null;
}


const program_parse_struct_header_line = (line) => {
  const regex = /struct\s+([_a-zA-Z]{1}[_a-zA-Z0-9]*)\s+\:/;
  const match = line.match(regex);
  if (match && match[1]) {
    return { type: "struct", data: { name: match[1], lines: [] } };
  }
  return null;
}


const program_parse_record_header_line = (line) => {
  const regex = /record\s+([_a-zA-Z]{1}[_a-zA-Z0-9]*)\s+\:/;
  const match = line.match(regex);
  if (match && match[1]) {
    return { type: "record", data: { name: match[1], lines: [] } };
  }
  return null;
}


const program_parse_function_header_line = (line) => {
  const regex = /function\s+([_a-zA-Z]{1}[_a-zA-Z0-9]*)\s+\:/;
  const match = line.match(regex);
  if (match && match[1]) {
    return { type: "function", data: { name: match[1], lines: [] } };
  }
  return null;
}


const program_parse_finalize_header_line = (line) => {
  const regex = /finalize\s+([_a-zA-Z]{1}[_a-zA-Z0-9]*)\s+\:/;
  const match = line.match(regex);
  if (match && match[1]) {
    return { type: "finalize", data: { name: match[1], lines: [] } };
  }
  return null;
}


const program_parse_block_body = (block, line) => {
  return (
    (block.type === "struct") ?
      program_parse_struct_body(block, line) :
      (block.type === "record") ?
        program_parse_record_body(block, line) :
        (block.type === "function") ?
          program_parse_function_body(block, line) :
          (block.type === "finalize") ?
            program_parse_finalize_body(block, line) :
            null
  );
}
/*
for (const [i, line_] of program_lines.entries()) {
  const line = line_.trim();
  if (!line) {
    if (current_block) {
      blocks.push(current_block);
      current_block = null;
    }
    continue;
  }
}
return program_blocks_to_definitions(blocks);
    if (current_struct) {
      const attribute_definition = line_to_attribute_definition(line);
      if (!attribute_definition) {
        this.structs.push(current_struct);
        current_struct = null;
      } else {
        current_struct.attributes.push(attribute_definition);
      }
      continue;
    }
    const struct_definition = line_to_struct_definition(line);
    if (struct_definition) {
      current_struct = {
        ...struct_definition,
        attributes: []
      };
    }
  }
};
  */



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



const line_to_attribute_definition = (line) => {
  const is_attribute_definition_regexp =
    /([_a-zA-Z]{1}[_a-zA-Z0-9]*)\s+as\s+([_a-zA-Z]{1}[_a-zA-Z0-9]*)\s+;/g;
  const {
    value: groups,
    done: no_match
  } = line.matchAll(is_attribute_definition_regexp).next();
  if (no_match)
    return null;
  const [_, name, type] = groups;
  return { name, type };
}
