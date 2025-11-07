
import path from 'path';
import fileUpload from 'express-fileupload';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import express from "express";
import * as bodyParser_ from "body-parser";
const bodyParser = bodyParser_.default; 

import { readMetadata, writeMetadata, writeAndReadMetadata } from "../scripts/exiftool.js";

const app = express()
const port = 3000

app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());
// app.use(express.static(path.join(__dirname, '../tmp'))); 
app.use("/tmp/", express.static(path.join(__dirname, '../tmp'))); 

// app.set('views', path.join(__dirname, 'views'));
app.set('views', path.join(__dirname));
app.set('view engine', 'ejs');

let file;

app.get('/', (req, res) => {
  const encrypt="", Title="", Description="", Performers="", Cost="", Beneficiary="", Fee="", Max="", Director="", Producer="";
  res.render("index", { encrypt, Title, Description, Performers, Cost, Beneficiary, Fee, Max, Director, Producer, file });
});

app.post('/load', async (req, res) => {
  try {
    // const { title, description } = req.body;
    let filePath = null;
    // Check if a file was uploaded
    if (req.files && req.files.upload) {
      const uploadObj = req.files.upload;
      const uploadDir = path.join(__dirname, '../tmp');
      filePath = path.join(uploadDir, uploadObj.name);
      // Create the uploads directory if it doesn't exist
      await fs.mkdir(uploadDir, { recursive: true });
      // Move the file to the uploads directory
      await uploadObj.mv(filePath);
      const metadata = await readMetadata(filePath, {"keep":true});
      // writeAndReadMetadata(filePath, {title, description});
      const { Title, Description, Performers, Cost, Beneficiary, Fee, Max, Director, Producer } = metadata;
      file = filePath;
      res.render("index", { Title, Description, Performers, Cost, Beneficiary, Fee, Max, Director, Producer, file: "/tmp/"+uploadObj.name  });
     }
   } catch (error) {
     console.error('Error processing request:', error);
     res.status(500).send('An error occurred while processing your request.');
   }
});

app.post('/submit', async (req, res) => {
  try {
    const { encryptY, encryptN, Title, Description, Performers, Cost, Beneficiary, Fee, Max, Director, Producer } = req.body;
    console.log(req.body)

    console.log('Encrypt:', encryptY || encryptN);
    console.log('Performers:', Performers);
    console.log(file)

    if (file)
      await writeMetadata(file, { Title, Description, Performers, Cost, Beneficiary, Fee, Max, Director, Producer }, {"keep":true});

    res.render("index", { Title, Description, Performers, Cost, Beneficiary, Fee, Max, Director, Producer, file });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).send('An error occurred while processing your request.');
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
