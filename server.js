require('dotenv').config();

const express = require('express');
// const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const os = require('os');
// const Trie = require('./public/Trie');
const http = require('http');
const { Server } = require('socket.io');
const ini = require('ini');
const { toTitleCase } = require('./utils');
const { url } = require('inspector');

const app = express();
app.use(express.json());

// Use cors middleware with specific origin allowed
// const corsOptions = {
// 	origin: 'chrome-extension://YOUR_EXTENSION_ID', // Replace with your extension ID
// 	methods: 'GET,POST,OPTIONS', // Include OPTIONS
// 	allowedHeaders: 'Content-Type',
// };
// app.use(cors(corsOptions));

const DB_PATH = process.env.DB_PATH || path.join(__dirname, './mydatabase.sqlite');
const PORT = process.env.PORT || 3000;

const TEMP_DB_NAME = 'latest_db.sqlite'; // Name of the uploaded file
const TEMP_DB_PATH = `./uploads/${TEMP_DB_NAME}`; // Temporary path for the uploaded file

const BACKUP_DIR = './backups/'; // Directory for database backups
const UPLOAD_DIR = './uploads/'; // Directory for uploaded files

const SONGREQUEST_LIST_FILE = path.join(__dirname, 'songRequests.json'); // Path to the JSON file
const SONGQUEUE_LIST_FILE = path.join(__dirname, 'songQueue.json'); // Path to the JSON file

// Global variable to store a list of songs
let songRequests = [];
const songQueue = {};

// let songList = [
//     { SequenceID: 1, Title: "Song Title 1", Artist: "Artist 1", url: "",Status: "Pending" }
//     // Add more songs as needed
// ];

// const trie = new Trie();
// trie.insert('apple');
// trie.insert('banana');

// Helper function to save json data to file
const saveToFile = (jsonFile, filename) => {
	try {
		console.log(`jsonfile ${jsonFile}`);
		fs.writeFileSync(filename, JSON.stringify(jsonFile, null, 2), 'utf8');
		console.log(`Saved data to ${filename}.`);
	} catch (err) {
		console.error(`Error writing to ${filename}:`, err);
	}
};

// Load songRequests from JSON file on startup
try {
	const data = fs.readFileSync(SONGREQUEST_LIST_FILE, 'utf8');
	songRequests = JSON.parse(data);
	// console.log('Loaded songList from JSON file.');

	// Format Artist and Title properties
	songRequests = songRequests.map((request) => ({
		SequenceID: request.SequenceID,
		Artist: request.Artist ? toTitleCase(request.Artist.trim()) : '',
		Title: request.Title ? toTitleCase(request.Title.trim()) : '',
		url: request.url,
		Status: request.Status,
	}));
} catch (err) {
	if (err.code === 'ENOENT') {
		console.log('songList.json not found. Initializing with an empty array.');
		songRequests = [];
	} else {
		console.error('Error reading songList.json:', err);
	}
}

// Endpoint to get the list of songs
app.get('/api/songrequests', (req, res) => {
	res.status(200).json(songRequests);
});

//handle preflight OPTIONS request
app.options('/api/songrequest', (req, res) => {
	console.log('Preflight OPTIONS request received');
	res.header('Access-Control-Allow-Origin', 'chrome-extension://bphhmfookodgepnfeficaakapfldemem');
	res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Content-Type');
	res.status(200).send(); //  Important:  Send a response!
});

// Endpoint to add a song to songsList
app.post('/api/songrequest', (req, res) => {
	res.header('Access-Control-Allow-Origin', 'chrome-extension://bphhmfookodgepnfeficaakapfldemem');
	res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Content-Type');

	console.log('Received POST request to add a song');
	console.log(req.body);
	const { Title, Artist, url, Status } = req.body;

	if (!Title && !Artist && !url) {
		return res.status(400).json({ error: 'Please enter at least a one field!' });
	}

	// Check if the song already exists
	const existingSong = songRequests.find(
		(song) =>
			song.Title.toLowerCase() === Title.toLowerCase() &&
			song.Artist.toLowerCase() === Artist.toLowerCase()
	);

	if (existingSong) {
		// If the song already exists, return a 409 Conflict response
		return res.status(409).json({
			message: 'Song already exists',
			existingSong,
		});
	}

	// If the song doesn't exist, create a new song
	let sequenceID = songRequests.length ? songRequests[songRequests.length - 1].SequenceID + 1 : 1;
	const newSong = {
		SequenceID: sequenceID,
		Title: toTitleCase(Title),
		Artist: toTitleCase(Artist),
		url,
		Status,
	};

	// Add the new song to the list
	songRequests.push(newSong);

	// Save the updated songList to the JSON file
	saveToFile(songRequests, SONGREQUEST_LIST_FILE);
	console.log(`Song with ID ${sequenceID} added.`);

	// Return a 201 Created response with the new song
	res.status(201).json(newSong);
});

// Endpoint to update a song in songList
app.put('/api/songrequest/:sequenceID', (req, res) => {
	const { sequenceID } = req.params;
	const { Artist, Title, url, Status } = req.body;

	// Find the song in the songList array
	const songIndex = songRequests.findIndex((song) => song.SequenceID == sequenceID);

	if (songIndex === -1) {
		return res.status(404).json({ error: 'Song not found' });
	}

	// Update the song with the new data
	if (Artist) songRequests[songIndex].Artist = toTitleCase(Artist);
	if (Title) songRequests[songIndex].Title = toTitleCase(Title);
	if (url) songRequests[songIndex].url = url;
	if (Status) songRequests[songIndex].Status = Status;

	// Save the updated songList to the JSON file
	saveToFile(songRequests, SONGREQUEST_LIST_FILE);
	console.log(`Song with ID ${sequenceID} updated.`);

	// Return the updated song
	res.status(200).json(songRequests[songIndex]);
});

// Endpoint to delete a song from songsList
app.delete('/api/songrequest/:sequenceID', (req, res) => {
	const { sequenceID } = req.params;
	const index = songRequests.findIndex((song) => song.SequenceID == sequenceID);
	if (index !== -1) {
		const deletedSong = songRequests.splice(index, 1);

		// Save the updated songList to the JSON file
		saveToFile(songRequests, SONGREQUEST_LIST_FILE);
		console.log(`Song with ID ${sequenceID} deleted.`);

		res.status(200).json(deletedSong);
	} else {
		res.status(404).json({ error: 'Song not found' });
	}
});

// Load songQueue from JSON file on startup
try {
	const data = fs.readFileSync(SONGQUEUE_LIST_FILE, 'utf8');
	const parsedData = JSON.parse(data);

	// Validate parsed data: Check if it's an object and has the expected structure
	if (typeof parsedData === 'object' && parsedData !== null) {
		for (const sessionId in parsedData) {
			if (parsedData.hasOwnProperty(sessionId) && Array.isArray(parsedData[sessionId].songs)) {
				songQueue[sessionId] = {
					songs: parsedData[sessionId].songs,
					lastUpdate: parsedData[sessionId].lastUpdate
						? new Date(parsedData[sessionId].lastUpdate)
						: new Date(), // Handle missing lastUpdate
				};
			} else {
				console.warn(`Invalid data format in songQueue.json for session ${sessionId}. Skipping.`);
			}
		}
		// console.log('Loaded songQueue from JSON file:', songQueue);
	} else {
		console.warn('Invalid JSON format in songQueue.json. Initializing with an empty object.');
	}
} catch (err) {
	if (err.code === 'ENOENT') {
		console.log('songQueue.json not found. Initializing with an empty object.');
	} else {
		console.error('Error reading or parsing songQueue.json:', err);
	}
}

// Ensure songQueue is always initialized as an object with the correct structure
if (typeof songQueue !== 'object' || songQueue === null) {
	songQueue = {};
}

// Endpoint to get the list of songs in the queue
app.get('/api/songqueue', (req, res) => {
	res.status(200).json(songQueue);
});

// Endpoint to get all songs in the queue for a given sessionId
app.get('/api/songqueue/session/:sessionId', (req, res) => {
	const { sessionId } = req.params;

	console.log(`Fetching songs for sessionId: ${sessionId}`);

	if (!songQueue[sessionId]) {
		return res
			.status(404)
			.json({ message: `No songs found for the given sessionId. [${sessionId}]` });
	}

	// Format songs before returning
	const formattedSongs = songQueue[sessionId].songs.map((song) => ({
		...song,
		Artist: toTitleCase(song.Artist.trim()),
		Title: toTitleCase(song.Title.trim()),
	}));

	res.status(200).json(songQueue[sessionId].songs); // Return the songs array
});

// Endpoint to add a song to the queue
app.post('/api/songqueue', (req, res) => {
	const { sessionId, Artist, Title, filePath, status, startTime } = req.body;
	console.log(sessionId, Artist, Title, filePath, startTime);
	if (!sessionId || !Artist || !Title || !filePath) {
		return res.status(400).json({ error: 'All fields are required!' });
	}

	// Ensure the session exists in songQueue
	if (!songQueue[sessionId]) {
		songQueue[sessionId] = {
			songs: [], // Initialize the songs array for this session
			lastUpdate: new Date(), // Add lastUpdate property
		};
	}

	// Generate sequenceID based on sessionId
	const highestSequenceId = getHighestSequenceId(sessionId);
	const sequenceID = highestSequenceId + 1;

	// Create a new song queue item
	const newSong = {
		sequenceID,
		Artist,
		Title,
		filePath,
		status,
		startTime,
	};

	// Add the new song to the queue
	songQueue[sessionId].songs.push(newSong); // Add to the correct session's songs array
	songQueue[sessionId].lastUpdate = new Date(); // Update lastUpdate

	// Save the updated songQueue to the JSON file
	console.log('saving to file');
	// console.log(`songQueue: ${songQueue}`);
	saveToFile(songQueue, SONGQUEUE_LIST_FILE);
	console.log(
		`SessionId[${sessionId}]: Song with ID ${sequenceID} added to the queue. (${Artist} - ${Title})`
	);

	//broadcast event
	console.log('emitting songQueueUpdated event');
	const queueCount = songQueue[sessionId].songs.length;
	io.emit('songQueueUpdated', {
		action: 'add',
		song: newSong,
		sessionID: sessionId,
		count: queueCount,
	});

	// Return the new song
	res.status(201).json(newSong);
});

// Endpoint to delete a song from the queue
app.delete('/api/songqueue/:sequenceID', (req, res) => {
	const { sequenceID } = req.params;
	const sessionId = req.query.sessionID; // Get sessionId from query parameters

	if (!songQueue[sessionId]) {
		return res.status(404).json({ message: 'No songs found for the given sessionId.' });
	}

	const songsForSession = songQueue[sessionId].songs;
	const songIndex = songsForSession.findIndex((song) => song.sequenceID === parseInt(sequenceID)); // Parse sequenceID to integer

	if (songIndex === -1) {
		return res
			.status(404)
			.json({ message: 'No song found with the given sequenceID for this session.' });
	}

	// Remove the song from the queue
	const removedSong = songsForSession.splice(songIndex, 1)[0]; // Remove the song
	songQueue[sessionId].lastUpdate = new Date(); // Update lastUpdate

	// Save the updated songQueue to the JSON file
	saveToFile(songQueue, SONGQUEUE_LIST_FILE);
	console.log(`[${sessionId}] Song with ID ${sequenceID} deleted from the queue.`);

	// broadcast event
	io.emit('songQueueUpdated', { action: 'remove', song: removedSong, sessionID: sessionId });

	// Return the deleted song
	res.status(200).json(removedSong);
});

// Helper function to find the highest sequence ID for a given session (modified)
function getHighestSequenceId(sessionId) {
	if (!songQueue[sessionId]) {
		return 0; // No songs for this session yet
	}
	const songsForSession = songQueue[sessionId].songs; // Access the songs array
	if (songsForSession.length === 0) {
		return 0;
	}
	const maxSequenceId = Math.max(...songsForSession.map((song) => song.sequenceID));
	console.log(`getHighestSequenceId: ${maxSequenceId}`);
	return maxSequenceId;
}

// Utility function to delete old sessions
function deleteOldSessions(days) {
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - days); // Calculate the date cutoff

	let deletedSessions = [];

	for (const sessionId in songQueue) {
		if (songQueue.hasOwnProperty(sessionId)) {
			const lastUpdate = new Date(songQueue[sessionId].lastUpdate); // Convert to Date object

			if (lastUpdate < cutoffDate) {
				deletedSessions.push(sessionId);
				delete songQueue[sessionId]; // Delete the session
				console.log(`Session ${sessionId} deleted (last update was ${lastUpdate})`);
			}
		}
	}

	saveToFile(songQueue, SONGQUEUE_LIST_FILE); // Save the updated songQueue
	return deletedSessions; // Return an array of deleted session IDs (optional)
}

//execute every hour
setInterval(() => {
	deleteOldSessions(3); // Delete sessions older than 3 days
}, 60 * 60 * 1000); // 60 minutes * 60 seconds * 1000 milliseconds (1 hour)

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
	fs.mkdirSync(BACKUP_DIR);
}
if (!fs.existsSync(UPLOAD_DIR)) {
	fs.mkdirSync(UPLOAD_DIR);
}

// Middleware to parse JSON
app.use(express.json());

// Open SQLite database connection
console.log('DB Path: ', DB_PATH);

db = new sqlite3.Database(DB_PATH, (err) => {
	console.log('Initializing DB...');
	if (err) {
		console.error('Error opening database:', err.message);
	} else {
		console.log(`Connected to the SQLite database at ${DB_PATH}.`);
	}
});

// Initialize the database (create table if it doesn't exist)
const initializeDatabase = () => {
	db.run(
		`
        CREATE TABLE IF NOT EXISTS dbSongs (
            songid INTEGER PRIMARY KEY AUTOINCREMENT,
            Artist TEXT COLLATE NOCASE,
            Title TEXT COLLATE NOCASE,
            DiscId TEXT COLLATE NOCASE,
            Duration INTEGER,
            path VARCHAR(700) NOT NULL UNIQUE,
            filename TEXT COLLATE NOCASE,
            searchstring TEXT,
            plays INTEGER DEFAULT 0,
            lastplay TIMESTAMP
        )
    `,
		(err) => {
			if (err) {
				console.error('Error creating table:', err.message);
			} else {
				console.log('Table "dbSongs" created or already exists.');
			}
		}
	);
};

// API to get all songs
app.get('/api/songs', (req, res) => {
	const { artist, title, page = 1, limit = 10 } = req.query;
	const offset = (page - 1) * limit;

	let sql = `SELECT * FROM dbSongs WHERE 1=1`;
	let countSql = `SELECT COUNT(*) AS total FROM dbSongs WHERE 1=1`;

	if (artist) sql += ` AND Artist LIKE '%${artist}%'`;
	if (title) sql += ` AND Title LIKE '%${title}%'`;

	sql += ` LIMIT ${limit} OFFSET ${offset}`;

	if (artist) countSql += ` AND Artist LIKE '%${artist}%'`;
	if (title) countSql += ` AND Title LIKE '%${title}%'`;

	db.all(sql, [], (err, rows) => {
		if (err) {
			return res.status(500).json({ error: err.message });
		}

		db.get(countSql, [], (err, countResult) => {
			if (err) {
				return res.status(500).json({ error: err.message });
			}

			const totalSongs = countResult.total;
			const totalPages = Math.ceil(totalSongs / limit);

			//format songs
			formattedRows = rows.map((row) => ({
				...row,
				Artist: toTitleCase(row.Artist),
				Title: toTitleCase(row.Title),
			}));

			res.json({
				data: formattedRows,
				pagination: {
					page: parseInt(page),
					limit: parseInt(limit),
					totalSongs,
					totalPages,
				},
			});
		});
	});
});

app.get('/api/songs/duplicates', (req, res) => {
	console.log('Finding duplicate songs...');
	const sql = `
		SELECT *
		FROM dbsongs
		WHERE (Artist, Title) IN (
			SELECT Artist, Title
			FROM dbsongs
			GROUP BY Artist, Title
			HAVING COUNT(*) > 1
		)
		ORDER BY Artist, Title;
    `;

	db.all(sql, [], (err, rows) => {
		if (err) {
			console.error('Error finding duplicates:', err);
			return res.status(500).json({ error: err.message });
		}

		const formattedRows = rows.map((row) => ({
			...row,
			Artist: row.Artist ? toTitleCase(row.Artist.trim()) : '',
			Title: row.Title ? toTitleCase(row.Title.trim()) : '',
		}));
		res.json(formattedRows);
		console.log(`Found ${formattedRows.length} duplicate songs.`);

		res.json(formattedRows);
	});
});

// API to get all unique Artist - Title
app.get('/api/uniquesongs', (req, res) => {
	const sql = `SELECT   DISTINCT TRIM((coalesce(Artist,'') || ' - '  || coalesce( Title,''))) as song 
                FROM dbSongs 
                WHERE song IS NOT NULL
                ORDER BY song`;

	db.all(sql, [], (err, rows) => {
		if (err) {
			console.log(`Get Unique Songs Error: ${err.message}`);
			return res.status(500).json({ error: err.message });
		} else {
			console.log(`Get Unique Songs: returned ${rows.length} songs.`);

			// Send the list to the client
			const songs = rows.map((row) => ({
				song: toTitleCase(row.song.trim()),
			}));
			res.json({ songs });
		}
	});
});

// API to add a new song
app.post('/api/songs', (req, res) => {
	const { Artist, Title, DiscId, Duration, path, filename, searchstring } = req.body;
	const sql = `
        INSERT INTO dbSongs (Artist, Title, DiscId, Duration, path, filename, searchstring)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
	db.run(sql, [Artist, Title, DiscId, Duration, path, filename, searchstring], function (err) {
		if (err) {
			res.status(500).json({ error: err.message });
		} else {
			res.json({ songid: this.lastID });
		}
	});
});

// API to delete a song
app.delete('/api/songs/:songid', (req, res) => {
	const { songid } = req.params;
	const sql = `DELETE FROM dbSongs WHERE songid = ?`;

	console.log(`Deleting song with ID ${songid}...`);
	db.get(`SELECT path FROM dbSongs WHERE songid = ?`, [songid], (err, row) => {
		if (err) {
			console.error('Error getting file path from database:', err.message);
			return res.status(500).json({ error: 'Database error' });
		}
		if (!row) {
			// No matching song found
			return res.status(404).json({ error: 'Song not found in database' });
		}
		let filePathToDelete = row.path; // Get the file path
		// Extract the last subfolder and filename
		const pathParts = filePathToDelete.split(path.sep);
		const filename = pathParts.pop();
		const lastSubfolder = pathParts.pop();
		filePathToDelete = path.join(videoDir, lastSubfolder, filename);
		console.log(`File path to delete: ${filePathToDelete}`);

		db.run(sql, [songid], function (err) {
			if (err) {
				console.error('Error deleting from database:', err.message);
				return res.status(500).json({ error: err.message });
			} else {
				console.log(`Deleted song with ID ${songid} from the database.`);
				// Delete the actual video file
				fs.unlink(filePathToDelete, (err) => {
					if (err) {
						console.error('Error deleting video file:', err);
						//  Don't block the response, but log the error
						return res.json({
							deleted: this.changes,
							fileDeleted: false,
							message: 'Song deleted from DB, but file deletion failed.',
						});
					} else {
						console.log(`Deleted video file: ${filePathToDelete}`);
						return res.json({
							deleted: this.changes,
							fileDeleted: true,
							message: 'Song and file deleted.',
						});
					}
				});
			}
		});
	});
});

// Endpoint to delete a file
app.delete('/api/delete-file', (req, res) => {
	const filePath = req.query.filePath;
	console.log('[/api/delete-file] Deleting file:', filePath);

	if (!filePath) {
		return res.status(400).json({ error: 'File path is required' });
	}

	const absolutePath = path.resolve(filePath);
	console.log('Absolute path:', absolutePath);

	fs.unlink(absolutePath, (err) => {
		if (err) {
			console.error('Error deleting file:', err);
			return res.status(500).json({ error: 'Failed to delete file' }); //  Send error response
		}
		console.log(`File deleted: ${absolutePath}`);
		res.status(200).json({ message: 'File deleted successfully' });
	});
});

// API to get a message
app.get('/api/getMessage', (req, res) => {
	const randomNumber = Math.floor(Math.random() * 1000);
	res.status(200).json({ message: `Hello, this is your message! Random number: ${randomNumber}` });
});

// API to search songs
app.get('/api/songs/search', (req, res) => {
	const { query, field } = req.query;
	console.log('Search query', query, 'Field:', field);
	let sql;
	const searchTerm = `%${query}%`;

	if (field && field !== 'ALL') {
		sql = `
            SELECT * FROM dbSongs
            WHERE ${field} LIKE ?
            ORDER BY Artist, Title
        `;
		db.all(sql, [searchTerm], (err, rows) => {
			if (err) {
				res.status(500).json({ error: err.message });
			} else {
				const formattedRows = rows.map((row) => ({
					...row,
					Artist: row.Artist ? toTitleCase(row.Artist.trim()) : '',
					Title: row.Title ? toTitleCase(row.Title.trim()) : '',
				}));
				res.json(formattedRows);
			}
		});
	} else {
		sql = `
            SELECT * FROM dbSongs
            WHERE Artist LIKE ? OR Title LIKE ? OR searchstring LIKE ?
            ORDER BY Artist, Title
        `;
		db.all(sql, [searchTerm, searchTerm, searchTerm], (err, rows) => {
			if (err) {
				res.status(500).json({ error: err.message });
			} else {
				const formattedRows = rows.map((row) => ({
					...row,
					Artist: row.Artist ? toTitleCase(row.Artist.trim()) : '',
					Title: row.Title ? toTitleCase(row.Title.trim()) : '',
				}));
				res.json(formattedRows);
			}
		});
	}
});

// Endpoint to fetch unique artist names from the database
app.get('/api/artist-names', (req, res) => {
	console.log('Fetching artist names...');
	const query = `
                SELECT DISTINCT Artist 
                FROM dbSongs 
                WHERE Artist IS NOT NULL 
                AND Artist != '' 
                ORDER BY Artist
            `;

	db.all(query, [], (err, rows) => {
		if (err) {
			console.error('Error fetching Artist names:', err);
			return res.status(500).json({ error: 'Failed to fetch artist names' });
		}
		// console.log('Fetched artist names:', rows);
		// Send the list of artist names to the client
		const artistNames = rows.map((row) => toTitleCase(row));
		res.json({ artistNames });
	});
});

// Multer configuration for database file upload
const dbStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		// cb(null, 'uploads/'); // Temporarily store the uploaded file in a 'temp' folder
		cb(null, UPLOAD_DIR); // Temporarily store the uploaded file in a 'temp' folder
	},
	filename: (req, file, cb) => {
		// Keep the filename constant (e.g., 'database.sqlite')
		cb(null, TEMP_DB_NAME);
	},
});
const uploadDb = multer({ storage: dbStorage });

// Add function to store Trie data
const storeTrieData = async () => {
	try {
		// Get all unique songs from the database
		const sql = `SELECT DISTINCT TRIM((coalesce(Artist,'') || ' - '  || coalesce( Title,''))) as song 
					FROM dbSongs 
					WHERE song IS NOT NULL
					ORDER BY song`;

		db.all(sql, [], (err, rows) => {
			if (err) {
				console.error('Error getting songs for Trie:', err);
				return;
			}

			// Format songs
			const songs = rows.map((row) => toTitleCase(row.song.trim()));

			// Create Trie data structure matching app.js format
			const trieData = {
				songs: songs.map((song) => ({ song })), // Match the format expected by app.js
				lastUpdated: new Date().toISOString(),
			};

			// Store in a file
			const trieFilePath = path.join(__dirname, 'public', 'trieData.json');
			fs.writeFileSync(trieFilePath, JSON.stringify(trieData, null, 2));
			console.log(`Trie data stored with ${songs.length} songs`);

			// Also store in localStorage format for direct use
			const localStorageTrieData = {
				root: {},
				wordCount: songs.length,
			};
			songs.forEach((song) => {
				let current = localStorageTrieData.root;
				for (const char of song) {
					if (!current[char]) {
						current[char] = {};
					}
					current = current[char];
				}
				current.isEndOfWord = true;
			});

			const localStorageFilePath = path.join(__dirname, 'public', 'localStorageTrieData.json');
			fs.writeFileSync(localStorageFilePath, JSON.stringify(localStorageTrieData, null, 2));
			console.log('LocalStorage Trie data stored');
		});
	} catch (error) {
		console.error('Error storing Trie data:', error);
	}
};

// Modify the upload-db endpoint to store Trie data
app.post('/api/upload-db', uploadDb.single('dbFile'), (req, res) => {
	console.log('Uploading database file...');
	if (!req.file) {
		return res.status(400).json({ error: 'No file uploaded.' });
	}
	console.log(req.file);

	try {
		// Step 1: Backup the original database file
		const backupFileName = `database-backup-${Date.now()}.sqlite`;
		const backupFilePath = path.join(BACKUP_DIR, backupFileName);
		fs.copyFileSync(DB_PATH, backupFilePath);
		console.log(`Backup created: ${backupFilePath}`);

		// Step 3: Refresh the SQLite database connection
		console.log('Closing database connection...');
		db.close((err) => {
			if (err) {
				console.error('Error closing database:', err.message);
			} else {
				console.log('Database connection closed.');
			}
		});

		// Step 2: Replace the original database file with the new one
		fs.renameSync(TEMP_DB_PATH, './mydatabase.sqlite');
		console.log('Database file replaced.');
		console.log(`${DB_PATH}`);

		db = new sqlite3.Database(DB_PATH, (err) => {
			if (err) {
				console.error('Error reopening database:', err.message);
			} else {
				console.log('Database connection refreshed.');
				// Store new Trie data
				storeTrieData();
			}
		});

		// Step 4: Respond to the client
		res.json({
			message: 'Database file uploaded and replaced successfully!',
			backupFile: backupFileName,
		});

		// Emit socket event to all connected clients to update their Tries
		io.emit('databaseUpdated', { message: 'Database updated, refreshing Trie...' });
	} catch (err) {
		console.error('Error during database file replacement:', err);
		res.status(500).json({ error: 'Failed to replace the database file.' });
	}
});

app.post('/api/batch-upload', (req, res) => {
	const videoDataArray = req.body;

	if (!videoDataArray || !Array.isArray(videoDataArray)) {
		return res
			.status(400)
			.json({ error: 'Invalid data format.  Expected an array of video data.' });
	}

	if (videoDataArray.length === 0) {
		return res.status(200).json({ success: true, message: 'No videos to upload.' });
	}

	// //for each item, append videoDir to path
	// videoDataArray.forEach((video) => {
	// 	video.Path = path.join(videoDir, video.Path);
	// });

	console.log('Batch uploading videos:', videoDataArray);
	return res.status(200).json({ success: true, message: 'Videos uploaded successfully.' });

	db.serialize(() => {
		// Use a transaction for efficiency
		db.run('BEGIN TRANSACTION;');

		const stmt = db.prepare(
			`INSERT INTO dbSongs (Artist, Title, StartTime, Duration, Path) VALUES (?, ?, ?, ?, ?)`
		);

		videoDataArray.forEach((video) => {
			stmt.run(video.Artist, video.Title, video.StartTime, video.Duration, video.Path, (err) => {
				if (err) {
					//  Rollback the transaction on any error
					db.run('ROLLBACK;');
					console.error('Error inserting video:', err);
					return res
						.status(500)
						.json({ error: 'Error inserting video data.', details: err.message });
				}
			});
		});
		stmt.finalize();

		db.run('COMMIT;', (err) => {
			if (err) {
				db.run('ROLLBACK;');
				console.error('Error committing transaction:', err);
				return res
					.status(500)
					.json({ error: 'Error committing transaction.', details: err.message });
			}
			console.log('Successfully inserted video data.');
			res.status(200).json({ success: true, message: 'Videos uploaded successfully.' });
		});
	});
	db.close();
});

// Endpoint to download a file
app.get('/api/download/:filename', (req, res) => {
	console.log('Downloading file:', './mydatabase.sqlite');
	const filename = req.params.filename;
	const filePath = path.join(__dirname, filename);

	console.log(`Downloading file: ${filePath}`);

	// Send the file for download
	res.download(filePath, filename, (err) => {
		if (err) {
			console.error('Error downloading file:', err);
			res.status(500).json({ error: 'Failed to download file.' });
		}
	});
});

// Helper function to generate random session ID
function generateSessionId() {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let result = '';
	for (let i = 0; i < 4; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

// Endpoint to get a new session ID
app.get('/api/getNewSessionID', (req, res) => {
	const sessionId = generateSessionId();
	console.log(`Generated new session ID: ${sessionId}`);
	res.json({ sessionId });
});

// API endpoint to list all video files
app.get('/api/videos', (req, res) => {
	fs.readdir(videoDir, (err, files) => {
		if (err) {
			return res.status(500).json({ error: 'Unable to read directory' });
		}
		const videoFiles = files.filter((file) => file.endsWith('.mp4')); // Filter for video files
		res.json({ videos: videoFiles });
	});
});

// Create an HTTP server
server = http.createServer(app);

// Initialize socket.io
// const io = new Server(server, {
// 	cors: {
// 		origin: (origin, callback) => {
// 			const allowedOrigins = [
// 				'http://192.168.1.6:5173', // Development frontend
// 				'https://your-production-domain.com', // Production frontend
// 			];
// 			if (!origin || allowedOrigins.includes(origin)) {
// 				callback(null, true); // Allow the request
// 			} else {
// 				callback(new Error('Not allowed by CORS')); // Block the request
// 			}
// 		},
// 		methods: ['GET', 'POST'],
// 	},
// });
const io = new Server(server, {
	cors: {
		origin: '*', // Allow all origins (replace with trusted domains in production)
		methods: ['GET', 'POST'], // Allowed HTTP methods
	},
});

// // Middleware to extract the token from headers
// app.use((req, res, next) => {
// 	const token = req.headers['x-api-token'] || req.headers['authorization'];
// 	app.locals.requestToken = token; // Store the token for later use
// 	next();
// });

io.use((socket, next) => {
	console.log('Socket:', socket.handshake.auth);
	const token = socket.handshake.auth.token; // Extract the token from the auth object

	// Validate the token
	if (token === 'karaoke-player-app') {
		return next(); // Allow the connection
	}

	next(new Error('Authentication error: Invalid token')); // Block the connection
});

// Serve static files (HTML, CSS, JS)
app.use(express.static('./'));
app.use(express.static('./public'));

// Read the ini file
const config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'));
// Get the video directory from the ini file
const videoDir = config.paths.videoDir;
console.log(`videoDir: ${videoDir}`);

// Middleware to check if the requested file exists
app.use('/videos', (req, res, next) => {
	console.log('Video request...');
	// Construct the full path to the requested file
	const filePath = path.join(videoDir, decodeURIComponent(req.path));
	// const filePath = '/Volumes/KINGSTONSSD/_Karaoke/_NEW_SONGS/ANG GAAN NG FEELING - GENEVA CRUZ.mp4'
	console.log(filePath);

	// Check if the file exists
	fs.access(filePath, fs.constants.F_OK, (err) => {
		if (err) {
			// File does not exist, respond with 404
			return res.status(404).json({ error: 'File not found' });
		}
		// File exists, proceed to serve it
		next();
	});
});

// Endpoint to check if a file exists
app.get('/api/file-exists', (req, res) => {
	const { filePath } = req.query;

	if (!filePath) {
		return res.status(400).json({ error: 'filePath query parameter is required.' });
	}

	const absolutePath = path.resolve(filePath); // Resolve the absolute path

	fs.access(absolutePath, fs.constants.F_OK, (err) => {
		if (err) {
			console.log(`File does not exist: ${absolutePath}`);
			return res.status(404).json({ exists: false, message: 'File does not exist.' });
		}

		console.log(`File exists: ${absolutePath}`);
		res.status(200).json({ exists: true, message: 'File exists.' });
	});
});

// Serve HLS files based on song name
app.get('/hls/:song', (req, res) => {
	console.log(`Request received for /hls/${req.params.song}/${req.params.file}`);
	const songName = req.params.song;
	const fileName = req.params.file;
	const filePath = path.join(__dirname, 'hls', songName, fileName);

	if (!fs.existsSync(filePath)) {
		console.log(`File not found: ${filePath}`);
		return res.status(404).send('File not found');
	}

	const stat = fs.statSync(filePath);
	const fileSize = stat.size;
	const range = req.headers.range;

	if (range) {
		const parts = range.replace(/bytes=/, '').split('-');
		const start = parseInt(parts[0], 10);
		const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
		const chunksize = end - start + 1;
		const file = fs.createReadStream(filePath, { start, end });
		res.writeHead(206, {
			'Content-Range': `bytes ${start}-${end}/${fileSize}`,
			'Accept-Ranges': 'bytes',
			'Content-Length': chunksize,
			'Content-Type': fileName.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t',
		});
		file.pipe(res);
	} else {
		res.sendFile(filePath);
	}
});

// app.get('/videos/:filename', (req, res) => {
// 	console.log('Serving video:', req.params.filename);
// 	const filename = req.params.filename + (req.params[0] || ''); // Include subfolder if present
// 	const filePath = path.join(__dirname, 'videos', filename); // Adjust path

// 	if (filename.endsWith('.mp4')) {
// 		res.setHeader('Content-Type', 'video/mp4');
// 	}

// 	res.sendFile(filePath, (err) => {
// 		if (err) {
// 			console.error('Error serving video:', err);
// 			res.status(404).json({ error: 'Video not found' });
// 		}
// 	});
// });

// // Catch-all for debugging
// app.use((req, res) => {
// 	console.log(`Unhandled request: ${req.method} ${req.url}`);
// 	res.status(404).send('Not found');
// });

app.use('/videos', express.static(videoDir));

// Function to get the local IP address
function getLocalIpAddress() {
	const interfaces = os.networkInterfaces();
	for (const interfaceName in interfaces) {
		for (const iface of interfaces[interfaceName]) {
			if (iface.family === 'IPv4' && !iface.internal) {
				return iface.address;
			}
		}
	}
	return '0.0.0.0'; // Fallback
}

// Handle socket connections
io.on('connection', (socket) => {
	console.log(`A user connected: ${socket.id}`);

	// Handle incoming messages from clients
	socket.on('message', (data) => {
		console.log('Message received:', data);
		// Broadcast the message to all connected clients
		io.emit('message', data);
	});

	// Handle disconnection
	socket.on('disconnect', () => {
		console.log('A user disconnected:', socket.id);
	});
});

// Start the server
// server = app.listen(PORT, () => {
// 	console.log(`Server running at http://${getLocalIpAddress()}:${PORT}`);
// });
server.listen(PORT, (err) => {
	if (err) {
		if (err.code === 'EADDRINUSE') {
			console.warn(`Port ${PORT} is in use, trying another port...`);
			server.listen(0); // Use an ephemeral port
		} else {
			console.error('Error starting server:', err);
		}
	} else {
		console.log(`Server running at http://${getLocalIpAddress()}:${server.address().port}`);
	}
});

// Handle server errors
server.on('error', (err) => {
	if (err.code === 'EADDRINUSE') {
		console.warn(`Port ${PORT} is in use, trying another port...`);
		server.listen(0); // Use an ephemeral port
	} else {
		console.error('Unexpected error starting server:', err);
		console.log('Shutting down the server...');
		process.exit(1); // Stop the web app on error
	}
});

// Handle server success
server.on('listening', () => {
	const address = server.address();
	console.log(`Server is listening on http://${getLocalIpAddress()}:${address.port}`);
});
