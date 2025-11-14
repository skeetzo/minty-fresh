
import path from 'path';
import fileUpload from 'express-fileupload';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../tmp');

import express from "express";
import * as bodyParser_ from "body-parser";
const bodyParser = bodyParser_.default; 

import { readMetadata, writeMetadata, writeAndReadMetadata } from "../src/utils/exiftool.js";

const app = express()
const port = 3000

app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());
// app.use(express.static(path.join(__dirname, '../tmp'))); 
app.use("/tmp/", express.static(path.join(__dirname, '../tmp'))); 

// app.set('views', path.join(__dirname, 'views'));
app.set('views', path.join(__dirname));
app.set('view engine', 'ejs');

let files = [];

app.get('/', (req, res) => {
  const encrypt="", Title="", Description="", Performers="", Cost="", Beneficiary="", Fee="", Max="", Director="", Producer="";
  res.render("index", { encrypt, Title, Description, Performers, Cost, Beneficiary, Fee, Max, Director, Producer, files });
});

app.post('/load', async (req, res) => {
  try {
    // const { title, description } = req.body;
    files = [];
    let metadata;
    // Check if a file was uploaded
    if (req.files && req.files.upload) 
      for (const file of req.files.upload) {
        // const uploadObj = req.files.upload;
        const filePath = path.join(uploadDir, file.name);
        // Create the uploads directory if it doesn't exist
        await fs.mkdir(uploadDir, { recursive: true });
        // Move the file to the uploads directory
        await file.mv(filePath);
        if (!metadata)
          metadata = await readMetadata(filePath, {"keep":true});
        // writeAndReadMetadata(filePath, {title, description});
        // let { Title, Description, Performers, Cost, Beneficiary, Fee, Max, Director, Producer } = metadata;
        files.push("/tmp/"+file.name);
       }
       // console.log(metadata)
    res.render("index", {Title:metadata.Title, Description:metadata.Description, Performers:metadata.Performers, Cost:metadata.Cost, Beneficiary:metadata.Beneficiary, Fee:metadata.Fee, Max:metadata.Max, Director:metadata.Director, Producer:metadata.Producer, files});
   } catch (error) {
     console.error('Error processing request:', error);
     res.status(500).send('An error occurred while processing your request.');
   }
});

app.post('/submit', async (req, res) => {
  try {
    // const { encryptY, encryptN, Title, Description, Performers, Cost, Beneficiary, Fee, Max, Director, Producer } = req.body;
    const { Title, Description, Performers, Cost, Beneficiary, Fee, Max, Director, Producer } = req.body;
    console.log("request:", req.body)

    // console.log('Encrypt:', encryptY || encryptN);
    // console.log('Performers:', Performers);

    for (const file of files)
      await writeMetadata(file, { Title, Description, Performers, Cost, Beneficiary, Fee, Max, Director, Producer }, {"keep":true});

    res.render("index", { Title, Description, Performers, Cost, Beneficiary, Fee, Max, Director, Producer, files });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).send('An error occurred while processing your request.');
  }
});

app.listen(port, () => {
  console.log(`Minty metadata editor listening on port ${port}`)
})
