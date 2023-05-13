
import config from 'getconfig';
import * as fs from "fs";
import * as fs_  from "fs/promises";
import * as path from 'path';
import * as JSONschemaDefaults from 'json-schema-defaults';

import { fileExists } from '../utils/helpers.mjs';
import IPFS from './ipfs.mjs';

import Ajv from "ajv"
const ajv = new Ajv() // options can be passed, e.g. {allErrors: true}

export const loadSchema = async function(schemaNameOrCID) {
    console.debug("loading schema: ", schema);
    if (IPFS.validateCIDString(schema))
        return await _loadSchemaFromIPFS(schemaNameOrCID);
    else
        return _loadSchemaFromFile(schemaNameOrCID);
}

const _loadSchemaFromIPFS = async function(schema) {
    console.debug("loading schema cid...");
    const cid = config.schemasIPFS[schema];
    return await IPFS.getIPFSJSON(cid);
}

const _loadSchemaFromFile = function(schema) {
    console.debug("loading schema file...");
    function _parseTemplate(t) {return JSON.parse(fs.readFileSync(`${config.SCHEMA_PATH}/${t}.json`))}
    // get list of template files from available files in available /schema directories
    const templates = [];
    const localPath = path.join(__dirname, "../..", config.SCHEMA_PATH), // path local to this script
          addonPath = path.join(process.env.PWD, config.SCHEMA_PATH);// path to where the cwd is
    const files = [];
    if (fileExists(localPath)) 
        files.push(...fs.readdirSync(localPath));
    if (addonPath != localPath && fileExists(addonPath))
        files.push(...fs.readdirSync(addonPath));
    let defaultIndex = 0;
    for (let i=0;i<files.length;i++) {
        const filename = files[i].replace(".json","");
        if (filename === schema) return _parseTemplate(filename);
        templates.indexOf(filename) === -1 ? templates.push(filename) : console.debug(`duplicate template found: ${filename}`)
        // set simple.json to default template
        if (filename === "simple") defaultIndex = i;
    }
    return _parseTemplate(templates[defaultIndex]);
}

export const parseSchema = function(schema) {return JSONschemaDefaults(schema)}

    // validate according to its schema
export const validateSchema = function(schema, metadata) {
    console.debug(`validating schema...`);
    // replace empty values with null for flagging validation
    // for (const [key, value] of Object.entries(this.metadata))
        // if (value === "") this.metadata[key] = null;
    const validate = ajv.compile(parseSchema(schema));
    const valid = validate(metadata);
    if (!valid) {
        console.error(validate.errors);
        throw new Error("Error: unable to validate data");
    }
    console.debug("valid JSON!");
}


// async function parseErrors(validationErrors) {
//     let errors = [];
//     validationErrors.forEach(error => {
//       errors.push({
//         param: error.params["missingProperty"],
//         key: error.keyword,
//         message: error.message,
//         property: (function() {
//           return error.keyword === 'minimum' ? error.dataPath : undefined
//         })() 
//       });
//     });

//     return errors;
// }

