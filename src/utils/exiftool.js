import { ExifTool, parseJSON } from "exiftool-vendored";
import path from "path";

const exiftool = new ExifTool({ exiftoolEnv: { EXIFTOOL_HOME: path.resolve("./config") }})

export async function writeMetadata(imagePath, metadata, opts={"verbose":false, "keep":false}) {
  try {
    await exiftool.write(imagePath, metadata, ['-overwrite_original']);
    console.debug("metadata added successfully");
  } catch (error) {
    if (opts.verbose)
      console.error("Error adding metadata:", error.message);
  } finally {
    if (!opts.keep)
      exiftool.end();
  }
}

export async function readMetadata(imagePath, opts={"verbose":false, "keep":false}) {
  try {
    const tags = await exiftool.read(imagePath);
    console.debug("metadata read successfully");
    const str = JSON.stringify(tags);
    if (opts.verbose)
      console.debug(parseJSON(str))
    return parseJSON(str);
  } catch (error) {
    if (opts.verbose)
      console.error("Error reading metadata:", error.message);
  } finally {
    if (!opts.keep)
      exiftool.end();
  }
}

export async function writeAndReadMetadata(imagePath, metadata) {
  try {
    await exiftool.write(imagePath, metadata, ['-overwrite_original']);
    const tags = await exiftool.read(imagePath);
    const str = JSON.stringify(tags);
    return parseJSON(str);
  } catch (error) {
    if (opts.verbose)
      console.error("Error reading metadata:", error.message);
  } finally {
    exiftool.end();
  }
}