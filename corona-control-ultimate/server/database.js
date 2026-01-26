/**
 * MockDatabase - Simple JSON-based persistence
 * Phase 23: Server-Architecture
 */
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db.json');

class MockDatabase {
    constructor() {
        this.data = {
            users: [],
            highscores: []
        };
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(DB_FILE)) {
                const raw = fs.readFileSync(DB_FILE, 'utf8');
                this.data = JSON.parse(raw);
                console.log('📦 Database loaded.');
            } else {
                this.save();
                console.log('📦 New Database created.');
            }
        } catch (e) {
            console.error('Database load error:', e);
        }
    }

    save() {
        try {
            fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2));
        } catch (e) {
            console.error('Database save error:', e);
        }
    }

    // User Operations
    updateUser(id, data) {
        let user = this.data.users.find(u => u.id === id);
        if (user) {
            Object.assign(user, data);
            user.lastSeen = Date.now();
        } else {
            user = { id, ...data, joinedAt: Date.now(), lastSeen: Date.now() };
            this.data.users.push(user);
        }
        this.save();
        return user;
    }

    getUser(id) {
        return this.data.users.find(u => u.id === id);
    }

    // Highscores
    addScore(username, score) {
        this.data.highscores.push({ username, score, date: Date.now() });
        this.data.highscores.sort((a, b) => b.score - a.score);
        this.data.highscores = this.data.highscores.slice(0, 10); // Keep top 10
        this.save();
    }

    getHighscores() {
        return this.data.highscores;
    }

    // Cloud Saves
    saveCloudData(userId, saveData) {
        let user = this.data.users.find(u => u.id === id || u.socketId === userId);
        if (!user) {
            user = { id: userId, socketId: userId, joinedAt: Date.now() };
            this.data.users.push(user);
        }
        user.cloudSave = saveData;
        user.lastSave = Date.now();
        this.save();
        return true;
    }

    getCloudData(userId) {
        const user = this.data.users.find(u => u.id === userId || u.socketId === userId);
        return user ? user.cloudSave : null;
    }
}

module.exports = new MockDatabase();
