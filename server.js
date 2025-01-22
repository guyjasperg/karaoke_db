require('dotenv').config();

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
// const Trie = require('./public/Trie');

const app = express();
app.use(express.json());

const DB_PATH = process.env.DB_PATH || path.join(__dirname, './mydatabase.sqlite');
const PORT = process.env.PORT || 3000;

const TEMP_DB_NAME = 'latest_db.sqlite'; // Name of the uploaded file
const TEMP_DB_PATH = `./uploads/${TEMP_DB_NAME}`; // Temporary path for the uploaded file

const BACKUP_DIR = './backups/'; // Directory for database backups
const UPLOAD_DIR = './uploads/'; // Directory for uploaded files

const SONGREQUEST_LIST_FILE = path.join(__dirname, 'songRequests.json'); // Path to the JSON file

// Global variable to store a list of songs
let songRequests = [];
// let songList = [
//     { SequenceID: 1, Title: "Song Title 1", Artist: "Artist 1", url: "",Status: "Pending" }
//     // Add more songs as needed
// ];

// const trie = new Trie();
// trie.insert('apple');
// trie.insert('banana');

// Load songList from JSON file on startup
try {
    const data = fs.readFileSync(SONGREQUEST_LIST_FILE, 'utf8');
    songRequests = JSON.parse(data);
    console.log('Loaded songList from JSON file.');
} catch (err) {
    if (err.code === 'ENOENT') {
        console.log('songList.json not found. Initializing with an empty array.');
        songRequests = [];
    } else {
        console.error('Error reading songList.json:', err);
    }
}

// Helper function to save songList to JSON file
const saveSongRequestsToFile = () => {
    try {
        fs.writeFileSync(SONGREQUEST_LIST_FILE, JSON.stringify(songRequests, null, 2), 'utf8');
        console.log('Saved songList to JSON file.');
    } catch (err) {
        console.error('Error writing to songList.json:', err);
    }
};

// Endpoint to get the list of songs
app.get('/api/songrequests', (req, res) => {
    res.status(200).json(songRequests);
});

// Endpoint to add a song to songsList
app.post('/api/songrequest', (req, res) => {
    console.log(req.body)
    const { Title, Artist, url,Status } = req.body;

    if (!Title && !Artist && !url) {
        return res.status(400).json({ error: 'Please enter at least a one field!' });
    }

    // Check if the song already exists
    const existingSong = songRequests.find(song =>
        song.Title.toLowerCase() === Title.toLowerCase() &&
        song.Artist.toLowerCase() === Artist.toLowerCase()
    );

    if (existingSong) {
        // If the song already exists, return a 409 Conflict response
        return res.status(409).json({
            message: "Song already exists",
            existingSong
        });
    }

    // If the song doesn't exist, create a new song
    let sequenceID = songRequests.length ? songRequests[songRequests.length - 1].SequenceID + 1 : 1
    const newSong = {
        SequenceID: sequenceID,
        Title,
        Artist,
        url,
        Status
    };

    // Add the new song to the list
    songRequests.push(newSong);

    // Save the updated songList to the JSON file
    saveSongRequestsToFile();
    console.log(`Song with ID ${sequenceID} added.`);

    // Return a 201 Created response with the new song
    res.status(201).json(newSong);
});

// Endpoint to update a song in songList
app.put('/api/songrequest/:sequenceID', (req, res) => {
    const { sequenceID } = req.params;
    const { Artist, Title, url, Status } = req.body;

    // Find the song in the songList array
    const songIndex = songRequests.findIndex(song => song.SequenceID == sequenceID);

    if (songIndex === -1) {
        return res.status(404).json({ error: 'Song not found' });
    }

    // Update the song with the new data
    if (Artist) songRequests[songIndex].Artist = Artist;
    if (Title) songRequests[songIndex].Title = Title;
    if (url) songRequests[songIndex].url = url;
    if (Status) songRequests[songIndex].Status = Status;

    // Save the updated songList to the JSON file
    saveSongRequestsToFile();
    console.log(`Song with ID ${sequenceID} updated.`);

    // Return the updated song
    res.status(200).json(songRequests[songIndex]);
});

// Endpoint to delete a song from songsList
app.delete('/api/songrequest/:sequenceID', (req, res) => {
    const { sequenceID } = req.params;
    const index = songRequests.findIndex(song => song.SequenceID == sequenceID);
    if (index !== -1) {
        const deletedSong = songRequests.splice(index, 1);

        // Save the updated songList to the JSON file
        saveSongRequestsToFile();
        console.log(`Song with ID ${sequenceID} deleted.`);

        res.status(200).json(deletedSong);
    } else {
        res.status(404).json({ error: 'Song not found' });
    }
});

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
    db.run(`
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
    `, (err) => {
        if (err) {
            console.error('Error creating table:', err.message);
        } else {
            console.log('Table "dbSongs" created or already exists.');
        }
    });
};


// API to get all users
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

            res.json({
                data: rows,
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

// API to add a new user
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

// API to delete a user
app.delete('/api/songs/:songid', (req, res) => {
    const { songid } = req.params;
    const sql = `DELETE FROM dbSongs WHERE songid = ?`;
    db.run(sql, [songid], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ deleted: this.changes });
        }
    });
});

// API to get a message
app.get('/api/getMessage', (req, res) => {
    const randomNumber = Math.floor(Math.random() * 1000);
    res.status(200).json({ message: `Hello, this is your message! Random number: ${randomNumber}` });
});

// API to search users
app.get('/api/songs/search', (req, res) => {
    const { query, field } = req.query;
    console.log('Search queryx:', query, 'Field:', field);
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
                res.json(rows);
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
                res.json(rows);
            }
        });
    }
});

// Endpoint to fetch unique artist names from the database
app.get("/artist-names", (req, res) => {
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
            console.error("Error fetching Artist names:", err);
            return res.status(500).json({ error: "Failed to fetch artist names" });
        }
        console.log('Fetched artist names:', rows);
        // Send the list of artist names to the client
        const artistNames = rows.map((row) => row);
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

// Endpoint for database file upload
app.post('/api/upload-db', uploadDb.single('dbFile'), (req, res) => {
    console.log('Uploading database file...');
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    console.log(req.file)

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
            }
        });

        // Step 4: Respond to the client
        res.json({
            message: 'Database file uploaded and replaced successfully!',
            backupFile: backupFileName,
        });
    } catch (err) {
        console.error('Error during database file replacement:', err);
        res.status(500).json({ error: 'Failed to replace the database file.' });
    }
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

// Serve static files (HTML, CSS, JS)
app.use(express.static('./'));
app.use(express.static('./public'));

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});