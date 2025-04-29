
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import * as fs from 'fs';
import * as path from "path";

// const Ajv = require("ajv");
import Ajv from "ajv"
// const { ErrorObject } = require("ajv");

import JSONschemaDefaults from 'json-schema-defaults';

const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}

const SCHEMA_PATH = path.join(__dirname, "../../config/schemas");

export function fromSchema(schema) {return JSONschemaDefaults(schema)}

export function loadSchemaFromFile(schema) {
    console.debug(`loading schema: ${schema}...`);
    function _parseTemplate(t) {return JSON.parse(fs.readFileSync(`${SCHEMA_PATH}/${t}.json`))}
    // get list of template files from available files in available /schema directories
    const templates = [];
    // const localPath = path.join(__dirname, "../../config", SCHEMA_PATH); // path local to this script
          // addonPath = path.join(process.env.PWD, SCHEMA_PATH);// path to where the cwd is
    const files = [];
    if (fs.existsSync(SCHEMA_PATH))
        files.push(...fs.readdirSync(SCHEMA_PATH));
    // console.log(files)
    let defaultIndex = 0;
    for (let i=0;i<files.length;i++) {
        const filename = files[i].replace(".json","");
        // console.log(filename)
        if (filename === schema) return _parseTemplate(filename);
        templates.indexOf(filename) === -1 ? templates.push(filename) : console.debug(`duplicate template found: ${filename}`)
        // set simple.json to default template
        if (filename === "test") defaultIndex = i;
    }
    return _parseTemplate(templates[defaultIndex]);
}

export function loadTemplates() {
    // const templates = [];
    const files = [];
    if (fs.existsSync(SCHEMA_PATH))
        files.push(...fs.readdirSync(SCHEMA_PATH));
    // for (let i=0;i<files.length;i++)
        // templates.push(files[i].replace(".json",""));
    return files.map((file) => file.replace(".json",""))
    // return templates;
}

export function validate(metadata, schema, schemaJSON) {
    console.debug(`validating NFT schema: ${schema}...`);
    console.debug(metadata)
    // replace empty values with null for flagging validation
    for (const [key, value] of Object.entries(metadata))
        if (value === "") metadata[key] = null;
    const validater = ajv.compile(schemaJSON);
    const valid = validater(metadata);
    if (!valid) {
        console.error(validater.errors);
        throw "Error: unable to validate data";
    }
    console.debug("valid JSON!");
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function getSchema(schemaName) {
    return fromSchema(loadSchemaFromFile(schemaName));
}