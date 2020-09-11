# Chrome image optimization extension

## How to install:
1. Download the performance_extension folder and unzip it
2. Open Chrome and type chrome://extensions/ 
3. Enable “Developer mode” in the top right corner
4. Choose “Load unpacked”.
5. Choose the unzipped folder from 1

## How to run:
1. Open Chrome
2. Browse a website using ShimmerCat
3. Click the extension icon in the top right corner

## Setting chunked image response compensation value
For images received from server in a chunked procedure, most of the filesize can be computed via simply counting the chunks, however some is lost due to missing padding and header structure. 
To change the value used to compensate for this missing data, change the constant value, CHUNKED_IMAGE_LOSS_COMPENSATION_PERCENT that is found in /content-js/state.js