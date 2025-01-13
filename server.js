require('dotenv').config();

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();

const DB_PATH = process.env.DB_PATH || path.join(__dirname, './mydatabase.sqlite');
const PORT = process.env.PORT || 3000;

const TEMP_DB_NAME = 'latest_db.sqlite'; // Name of the uploaded file
const TEMP_DB_PATH = `./uploads/${TEMP_DB_NAME}`; // Temporary path for the uploaded file

const BACKUP_DIR = './backups/'; // Directory for database backups
const UPLOAD_DIR = './uploads/'; // Directory for uploaded files

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
    const sql = `SELECT * FROM dbSongs`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
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

// // Configure multer for file uploads
// const upload = multer({
//     dest: 'uploads/', // Destination folder for uploaded files
//     limits: { fileSize: 50 * 1024 * 1024 }, // Limit file size to 50MB
// });

// API to handle database file upload
// app.post('/api/upload', upload.single('dbFile'), (req, res) => {
//     if (!req.file) {
//         return res.status(400).json({ error: 'No file uploaded' });
//     }

//     const tempPath = req.file.path;
//     const targetPath = path.join(__dirname, 'uploads', req.file.originalname);

//     // Move the file to the target location
//     fs.rename(tempPath, targetPath, (err) => {
//         if (err) {
//             return res.status(500).json({ error: 'Failed to move file' });
//         }

//         // Optionally, you can add code here to process the uploaded database file

//         res.status(200).json({ message: 'File uploaded successfully', filePath: targetPath });
//     });
// });

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


// Serve static files (HTML, CSS, JS)
app.use(express.static('./'));
app.use(express.static('./public'));

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});