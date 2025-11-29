
import path from 'path';
import fileUpload from 'express-fileupload';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../tmp');
// const collectionsDir = path.join(uploadDir, "collections");
const collectionsDir = "/home/skeetzo/Pictures/collections"

import express from "express";
import * as bodyParser_ from "body-parser";
const bodyParser = bodyParser_.default; 

import { readMetadata, writeMetadata, writeAndReadMetadata } from "../src/utils/exiftool.js";

const app = express()
const port = 3000

let files = [];
const contentTypes = ["Solo","BG","BGA","BGG","BGGG"];

function presets() {
  return {preselectedValue:contentTypes[0], Location: "", Title:"", Description:"", Performers:"", Cost:"", Type:"", Fee:"", Max:"", Date_:"", Collection:"", contentTypes}
}

async function processFile(file) {
  // console.log(file)
  const filePath = path.join(uploadDir, file.name);
  await fs.mkdir(uploadDir, { recursive: true });
  await file.mv(filePath);
  const metadata = await readMetadata(filePath, {"keep":true});
  // console.log(metadata)
  files.push(filePath);
  return metadata;
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());
// app.use(express.static(path.join(__dirname, '../tmp'))); 
app.use("/tmp/", express.static(path.join(__dirname, '../tmp'))); 

// app.set('views', path.join(__dirname, 'views'));
app.set('views', path.join(__dirname));
app.set('view engine', 'ejs');


app.get('/', (req, res) => {
  res.render("index", { ...presets(), files });
});

app.post('/load', async (req, res) => {
  files = [];
  try {
    console.log(req.files.upload)
    let metadata = {...presets()};
    if (req.files && req.files.upload && Array.isArray(req.files.upload)) 
      for (const file of req.files.upload)
        metadata = {...metadata, ...await processFile(file)}
    else
      metadata = {...metadata, ...await processFile(req.files.upload)}
    // console.log("files:", files);
    res.render("index", {contentTypes, Type:metadata.Type, Title:metadata.Title, Description:metadata.Description, Performers:Array.from(metadata.Performers), Cost:parseInt(metadata.Cost), Location:metadata.Location, Fee:metadata.Fee, Max:metadata.Max, Date_:metadata.Date_, Collection:metadata.Collection, files});
   } catch (error) {
     console.error('Error processing request:', error);
     res.status(500).send('An error occurred while processing your request.');
   }
});

app.post('/submit', async (req, res) => {
  try {
    const { Collection, Title, Description, Performers, Cost, Type, Fee, Max, Date_ } = req.body;
    // console.log("request:", req.body)

    for (const file of files) {
      await writeMetadata(file, { Location, Title, Description, Performers, Cost, Beneficiary, Fee, Max, Director, Producer, Collection }, {"verbose":true,"keep":true});
      if (Collection != "") {
        await fs.mkdir(path.join(collectionsDir, Collection), { recursive: true });
        fs.rename(file, path.join(collectionsDir, Collection, path.basename(file)))
      }
    }
    files = []
    res.render("index", { ...presets(), files });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).send('An error occurred while processing your request.');
  }
});

app.listen(port, () => {
  console.log(`Minty metadata editor listening on port ${port}`)
})
