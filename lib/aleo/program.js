import { network_get_program, network_deploy_program } from './network.js';


export class Program {
  constructor(name) {
    this.name = name;
    this.id = `${this.name}.aleo`
  }

  async load() {
    const code = await network_get_program(this.id);
    return this.load_from_code(code);
  }

  load_from_code(code) {
    this.code = code;
    this._load_structs();

    return this;
  }

  async deploy() {
    console.log(`Deploying '${this.id}' with code:`);
    console.log(this.code);
    return await network_deploy_program(this.id, this.code);
  }

  async call(function_name, args) {
    console.log(`Executing ${this.id}/${function_name} with args:`);
    console.log(args);
  }

  _load_structs() {
    this.structs = [];
    const program_lines = this.code.split("\n");
    let current_struct = null;
    for (const [i, line_] of program_lines.entries()) {
      const line = line_.trim();
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
    return this;
  }
}

const line_to_struct_definition = (line) => {
  const is_struct_definition_regexp = /struct ([_a-zA-Z]{1}[_a-zA-Z0-9]*)\:/g;
  const {
    value: groups,
    done: no_match
  } = line.matchAll(is_struct_definition_regexp).next();
  if (no_match)
    return null;
  const [_, struct_name] = groups;
  return {
    name: struct_name,
  };
}


const line_to_attribute_definition = (line) => {
  const is_attribute_definition_regexp = /([_a-zA-Z]{1}[_a-zA-Z0-9]*) as ([_a-zA-Z]{1}[_a-zA-Z0-9]*);/g;
  const {
    value: groups,
    done: no_match
  } = line.matchAll(is_attribute_definition_regexp).next();
  if (no_match)
    return null;
  const [_, name, type] = groups;
  return { name, type };
}
