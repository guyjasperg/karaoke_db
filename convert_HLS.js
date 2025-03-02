const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const videoDir = './videos'; // Directory with your .webm files
const outputDir = './hls'; // Where HLS files will go

fs.readdir(videoDir, (err, files) => {
	if (err) throw err;
	files.forEach((file) => {
		if (file.endsWith('.mp4')) {
			const input = path.join(videoDir, file);
			const outputFolder = path.join(outputDir, path.basename(file, '.mp4'));
			fs.mkdirSync(outputFolder, { recursive: true });
			const outputPlaylist = path.join(outputFolder, 'playlist.m3u8');
			const segmentPattern = path.join(outputFolder, 'segment%d.ts');

			const cmd = `ffmpeg -i "${input}" -c:v libx264 -c:a aac -preset veryfast -f hls -hls_time 10 -hls_list_size 0 -hls_segment_filename "${segmentPattern}" "${outputPlaylist}"`;
			exec(cmd, (err) => {
				if (err) console.error(`Error converting ${file}:`, err);
				else console.log(`${file} converted to HLS`);
			});
		}
	});
});
