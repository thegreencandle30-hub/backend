const fs = require('fs');
const ytdl = require('ytdl-core');

// The YouTube URL you want to download
const videoURL = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'; 

// Function to download the video
async function downloadVideo(url) {
    console.log('Fetching video metadata...');
    
    try {
        // Get video info to use the title as the filename
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title.replace(/[^\x00-\x7F]/g, ""); // Remove non-ascii characters
        const fileName = `${title}.mp4`;

        console.log(`Downloading: ${title}`);

        // Pipe the video stream to a file
        ytdl(url, { quality: 'highestvideo' })
            .pipe(fs.createWriteStream(fileName))
            .on('finish', () => {
                console.log(`Finished! Video saved as ${fileName}`);
            })
            .on('error', (err) => {
                console.error('Error during download:', err);
            });

    } catch (error) {
        console.error('Error fetching video:', error);
    }
}

downloadVideo(videoURL);