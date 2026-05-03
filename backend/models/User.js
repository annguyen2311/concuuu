const mongoose = require('mongoose');

// In-memory storage for development
let users = [];
let userIdCounter = 1;

const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    email: String,
    password: String,
    reputation: { type: Number, default: 0 },
    bio: String,
    avatar: String,
    school: String,
    major: String,
    joinDate: { type: Date, default: Date.now }
});

// Create model
const User = mongoose.model('User', UserSchema);

// Override Mongoose methods with in-memory implementation
User.create = async function(data) {
    if (users.find(u => u.username === data.username)) {
        throw new Error('Username already exists');
    }
    const user = {
        _id: userIdCounter++,
        ...data,
        reputation: 0,
        bio: '',
        avatar: data.username.charAt(0).toUpperCase(),
        school: '',
        major: '',
        joinDate: new Date()
    };
    users.push(user);
    console.log('✅ User created:', user.username);
    return user;
};

User.findOne = async function(query) {
    console.log('🔍 Finding user:', query);
    const result = users.find(u => u.username === query.username || u.email === query.email);
    return result || null;
};

User.findOneAndUpdate = async function(query = {}, update = {}) {
    const user = users.find(u => u.username === query.username);
    if (user) {
        Object.assign(user, update);
    }
    return user;
};

class QueryBuilder {
    constructor(data) {
        this.data = [...data];
        this.sortConfig = null;
        this.limitConfig = null;
    }

    sort(obj) {
        this.sortConfig = obj;
        if (obj.reputation === -1) {
            this.data.sort((a, b) => b.reputation - a.reputation);
        }
        return this;
    }

    limit(n) {
        this.limitConfig = n;
        this.data = this.data.slice(0, n);
        return this.data;
    }

    toArray() {
        return this.data;
    }

    [Symbol.iterator]() {
        return this.data[Symbol.iterator]();
    }
}

User.find = async function(query = {}) {
    const qb = new QueryBuilder(users);
    return qb;
};

User.deleteOne = async function(query = {}) {
    const idx = users.findIndex(u => u.username === query.username);
    if (idx >= 0) {
        users.splice(idx, 1);
    }
    return { deletedCount: idx >= 0 ? 1 : 0 };
};

module.exports = User;
