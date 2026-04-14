import { ExifTool, parseJSON } from "exiftool-vendored";
import path from "path";

// TODO: remove the keep variable as its no longer necessary, should be handled by the disposalTimeoutMs and asyncDisposalTimeoutMs
const exiftool = new ExifTool({
  maxProcs: 1, // More concurrent processes
  minDelayBetweenSpawnMillis: 0, // Faster spawning
  streamFlushMillis: 10, // Faster streaming
  disposalTimeoutMs: 10000, // 2 seconds for sync disposal
  asyncDisposalTimeoutMs: 30_000, // 30 seconds for async disposal
  exiftoolEnv: { EXIFTOOL_HOME: path.resolve("./config") }
})

export async function writeMetadata(imagePath, metadata, opts={"verbose":false, "keep":false}) {
  console.debug("writing metadata to file:", imagePath);
  try {
    await exiftool.write(imagePath, metadata, ['-overwrite_original']);
    console.debug("metadata added successfully");
  } catch (error) {
    if (opts.verbose)
      console.error("Error adding metadata:", error.message);
  } finally {
    // if (!opts.keep)
      // await exiftool.end();
  }
}

export async function readMetadata(imagePath, opts={"verbose":false, "keep":false}) {
  console.debug("reading metadata from file:", imagePath);
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
    // if (!opts.keep)
      // await exiftool.end();
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
    // await exiftool.end();
  }
}