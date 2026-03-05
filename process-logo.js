const Jimp = require('jimp');
const fs = require('fs');
const pngToIco = require('png-to-ico').default;

const INPUT_IMAGE = './logo.png';
const OUTPUT_PNG = './icon.png';
const OUTPUT_ICO = './icon.ico';

async function processImage() {
  try {
    console.log('Reading image...');
    const image = await Jimp.read(INPUT_IMAGE);
    
    console.log('Making white background transparent...');
    // Iterating over all pixels to remove white/off-white background
    const tolerance = 240;
    
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const red   = this.bitmap.data[idx + 0];
      const green = this.bitmap.data[idx + 1];
      const blue  = this.bitmap.data[idx + 2];

      if (red > tolerance && green > tolerance && blue > tolerance) {
        this.bitmap.data[idx + 3] = 0; // Make transparent
      }
    });

    // We can also trim the transparent edges automatically
    image.autocrop();

    // Resize to a nice square power of 2
    image.resize(512, 512, Jimp.RESIZE_BICUBIC);
    
    console.log('Writing transparent icon.png...');
    await image.writeAsync(OUTPUT_PNG);
    
    console.log('Generating icon.ico...');
    const buf = await pngToIco(OUTPUT_PNG);
    fs.writeFileSync(OUTPUT_ICO, buf);
    
    console.log('Copying to frontend...');
    fs.writeFileSync('./frontend/public/favicon.ico', buf);
    
    console.log('Done!');
  } catch (error) {
    console.error('Error processing image:', error);
  }
}

processImage();
