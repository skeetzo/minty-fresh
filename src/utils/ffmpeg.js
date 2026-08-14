import * as path from 'path';
import * as fs from "fs/promises";
import ffmpeg from 'fluent-ffmpeg';
import sharp from "sharp";

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '../../tmp/thumbnails');

function checkFileType(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(new Error(`Failed to parse file: ${err.message}`));
      }

      // 1. Check for the presence of a video stream
      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');

      if (!videoStream) {
        return resolve({ type: 'audio_or_other', isVideo: false, isImage: false });
      }

      // 2. Identify common image container formats detected by FFmpeg
      const formatName = metadata.format.format_name || '';
      const isImageFormat = formatName.includes('image2') || formatName.includes('png_pipe') || formatName.includes('pip_jpeg');

      // 3. Fallback logic: check duration and frame count
      // Videos have an explicit duration. Images typically have a duration of 0 or undefined, and exactly 1 frame.
      const duration = parseFloat(metadata.format.duration || 0);
      const nbFrames = parseInt(videoStream.nb_frames || 0, 10);

      if (isImageFormat || (duration === 0 && nbFrames === 1)) {
        return resolve({ type: 'image', isVideo: false, isImage: true });
      }

      // It has a video stream, a valid duration, or multiple frames, making it a true video
      return resolve({ type: 'video', isVideo: true, isImage: false });
    });
  });
}

export async function generateThumbnail(filePath) {
  console.debug("generating thumbnail:", filePath);
  const status = await checkFileType(filePath);
  // console.debug("status:", status);
  if (status.isImage)
    return await parseImage(filePath);
  else if (status.isVideo)
    return parseVideo(filePath);
  return "";
}

async function parseImage(filePath) {
  console.debug("parsing thumbnail image")
  const filename = path.basename(filePath).split(".")[0]+".png";
  try {
    await sharp(filePath)
      .resize(150, 150, {
        fit: 'inside', // Maintains aspect ratio while fitting within 150x150
        withoutEnlargement: true // Prevents making small images pixelated
      })
      .toFormat('png', { quality: 80 }) // Compresses the file size
      .toFile(path.join(OUTPUT_DIR, filename));
    console.debug('Image Thumbnail successfully created!');
    return path.join(OUTPUT_DIR, filename);
  }
  catch (err) {
    console.error('Error generating thumbnail:', err);
  }
}

function parseVideo(filePath) {
  console.debug("parsing thumbnail video")
  const filename = path.basename(filePath).split(".")[0]+".png";
  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      // .on('filenames', function(filenames) {
      //   console.debug('Will generate ' + filenames.join(', '));
      // })
      .on('end', () => {
        console.debug('Video Thumbnail successfully extracted and saved!');
        resolve(path.join(OUTPUT_DIR, filename));
      })
      .on('error', (err) => {
        console.error('An error occurred: ' + err.message);
        reject();
      })
      .screenshots({
        count: 1,
        // Will take a screenshot at 5 seconds into the video
        timestamps: [5], 
        // The filename format for the output image
        filename, 
        folder: OUTPUT_DIR,
        // Optional: Resize the thumbnail (width x height)
        size: '320x240' 
      })
  });
}