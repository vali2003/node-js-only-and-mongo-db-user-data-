const http = require('http');
const mongoose = require('mongoose');

// MongoDB connection
const mongoURI = 'mongodb://localhost:27017/userdb'; // Change this URI according to your MongoDB setup
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// User Schema and Model
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    dateOfBirth: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// Create the server
const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');

    // Handle GET request for all users
    if (req.method === 'GET' && req.url === '/users') {
        User.find()
            .then(users => {
                res.writeHead(200);
                res.end(JSON.stringify(users));
            })
            .catch(err => {
                res.writeHead(500);
                res.end(JSON.stringify({ message: 'Server error', error: err.message }));
            });
        return;
    }

    // Handle POST request to add a new user
    if (req.method === 'POST' && req.url === '/users') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString(); // Convert Buffer to string
        });
        req.on('end', () => {
            try {
                const newUser = JSON.parse(body);
                const validationErrors = validateUser(newUser);
                if (validationErrors) {
                    res.writeHead(400);
                    return res.end(JSON.stringify({ errors: validationErrors }));
                }

                const user = new User(newUser);
                user.save()
                    .then(savedUser => {
                        res.writeHead(201);
                        return res.end(JSON.stringify(savedUser));
                    })
                    .catch(err => {
                        res.writeHead(500);
                        return res.end(JSON.stringify({ message: 'Server error', error: err.message }));
                    });
            } catch (error) {
                res.writeHead(500);
                return res.end(JSON.stringify({ message: 'Server error', error: error.message }));
            }
        });
        return;
    }

    // Handle PUT request to update a user
    if (req.method === 'PUT' && req.url.startsWith('/users/')) {
        const userId = req.url.split('/')[2];
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString(); // Convert Buffer to string
        });
        req.on('end', () => {
            try {
                const updatedUser = JSON.parse(body);
                const validationErrors = validateUser(updatedUser);
                if (validationErrors) {
                    res.writeHead(400);
                    return res.end(JSON.stringify({ errors: validationErrors }));
                }

                User.findByIdAndUpdate(userId, updatedUser, { new: true, runValidators: true })
                    .then(user => {
                        if (!user) {
                            res.writeHead(404);
                            return res.end(JSON.stringify({ message: 'User not found' }));
                        }
                        res.writeHead(200);
                        res.end(JSON.stringify(user));
                    })
                    .catch(err => {
                        res.writeHead(500);
                        res.end(JSON.stringify({ message: 'Server error', error: err.message }));
                    });
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ message: 'Server error', error: error.message }));
            }
        });
        return;
    }

    // Handle DELETE request to remove a user
    if (req.method === 'DELETE' && req.url.startsWith('/users/')) {
        const userId = req.url.split('/')[2];
        User.findByIdAndDelete(userId)
            .then(user => {
                if (!user) {
                    res.writeHead(404);
                    return res.end(JSON.stringify({ message: 'User not found' }));
                }
                res.writeHead(204); // No content
                res.end();
            })
            .catch(err => {
                res.writeHead(500);
                res.end(JSON.stringify({ message: 'Server error', error: err.message }));
            });
        return;
    }

    // Handle unsupported routes
    res.writeHead(404);
    res.end(JSON.stringify({ message: 'Route not found' }));
});

// Start the server
const PORT = 1234;
server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});

// User validation function
function validateUser(user) {
    const errors = [];
    if (!user.username || typeof user.username !== 'string' || user.username.length < 1) {
        errors.push('username is required and should be at least 1 character long.');
    }
    if (!user.email || typeof user.email !== 'string' || !/\S+@\S+\.\S+/.test(user.email)) {
        errors.push('email is required and should be a valid email address.');
    }
    if (!user.phone || typeof user.phone !== 'string' || !/^\+?[1-9]\d{1,14}$/.test(user.phone)) {
        errors.push('phone is required and should be a valid phone number.');
    }
    if (!user.dateOfBirth || typeof user.dateOfBirth !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(user.dateOfBirth)) {
        errors.push('dateOfBirth is required and must be in YYYY-MM-DD format.');
    }
    return errors.length ? errors : null; // Return errors or null if valid
}
