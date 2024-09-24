const path = require('path');
const http = require('http');

const bodyParser = require('body-parser');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const socketIo = require('socket.io');

// initialization
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const active_users = new Set();

// initialization of database
const db = new sqlite3.Database('./database/chat_app.db', (err) => {
    if (err) {
        console.error('Failed to connect to the database:', err.message);
    } else {
        console.log('Database connected.');
    }
});


// create tables if they do not exist
const database_initialization = () => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            message TEXT,
            timestamp TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);
};

database_initialization();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});


// registeration
app.post('/register', (req, res) => {
    const { username, password } = req.body;

    const register_query = `
        INSERT INTO users (username, password)
        VALUES (?, ?)
    `;

    db.run(register_query, [username, password], function (err) {
        if (err) {
            if (err.code === 'SQLITE_CONSTRAINT') {
                return res.status(400).json({ error: 'Username already exists.' });
            }
            return res.status(500).json({ error: 'Database error.' });
        }
        return res.json({ success: true });
    });
});

// login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // check if the user is already logged in
    if (active_users.has(username)) {
        return res.status(400).json({ error: 'User is already logged in.' });
    }

    const login_query = `
        SELECT * FROM users WHERE username = ?
    `;

    db.get(login_query, [username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error.' });
        }
        // bug fixed
        if (!user) {
            // console.log(user.username)
            return res.status(400).json({ error: 'Username not found.' });
        }
        if (password !== user.password) {
            return res.status(400).json({ error: 'Incorrect password.' });
        }

        // add user to active_users list 
        active_users.add(username);
        return res.json({ success: true });
    });
});

// chat
io.on('connection', (socket) => {
    socket.on('user_join_chatroom', (username) => {
        socket.username = username;
        
        // order does not show correctly
        // bug fixed
        const message_query = `
            SELECT messages.message AS text, messages.timestamp, users.username
            FROM messages
            JOIN users ON messages.user_id = users.id
            ORDER BY datetime(messages.timestamp) ASC
        `;

        db.all(message_query, [], (err, messages) => {
            if (err) {
                // console.error('Failed here, load data from db');
                return;
            }
            
            // foramting the timestamp
            // day / month / year, hour: minute AM/PM
            messages.forEach(msg => {
                msg.timestamp = new Date(msg.timestamp).toLocaleString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true
                });
            });

            socket.emit('send_all_messages', messages);
        });
    });

    socket.on('send_one_message', (msg) => {
        const message_query2 = `
            SELECT id FROM users WHERE username = ?
        `;

        db.get(message_query2, [msg.username], (err, user) => {
            if (err) {
                return;
            }

            if (user) {
                const isoTimestamp = new Date().toISOString();
                // insert message to the database
                const insertMessageQuery = `
                    INSERT INTO messages (user_id, message, timestamp)
                    VALUES (?, ?, ?)
                `;

                db.run(insertMessageQuery, [user.id, msg.text, isoTimestamp], (err) => {
                    if (err) {
                        // console.error('Failed to insert message:', err.message);
                        return;
                    }

                    msg.timestamp = new Date(isoTimestamp).toLocaleString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: true
                    });

                    io.emit('send_one_message', msg);
                });
            }
        });
    });

    socket.on('disconnect', () => {
        // remove user from active_users list
        if (socket.username) {
            active_users.delete(socket.username);
        }
    });
});

// start the server
server.listen(3000, () => {
    console.log(`http://localhost:3000`);
});;
