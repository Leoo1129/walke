import pool from '../database/database.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

class InputError extends Error {}

export async function login(name, password) {
    if (!name || !password) {
        const error = new Error('name and password are required');
        error.statusCode = 400;
        throw error;
    }

    const { rows: [user] } = await pool.query(
        'SELECT id, name, password_hash FROM users WHERE name = $1',
        [name]
    );

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        const error = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
    }

    const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    return { token };
}

export async function createUser(name, password, street, city, postcode, country) {
    if (!name || !password)
        throw new InputError('name and password are required');

    const password_hash = await bcrypt.hash(password, 10);

    const { rows: [user] } = await pool.query(
        'INSERT INTO users (name, password_hash, street, city, postcode, country) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, street, city, postcode, country, created_at, last_updated',
        [name, password_hash, street, city, postcode, country]
    );

    if (!user) {
        const error = new Error('Failed to create user');
        error.statusCode = 500;
        throw error;
    }

    return user;
}

export async function getUsers() {
    const { rows } = await pool.query('SELECT id, name, street, city, postcode, country, created_at, last_updated FROM users');

    if (!rows || rows.length === 0) {
        const error = new Error('No users found');
        error.statusCode = 404;
        throw error;
    }

    return rows;
}

export async function getUser(id) {
    const { rows: [user] } = await pool.query(
        'SELECT id, name, street, city, postcode, country, created_at, last_updated FROM users WHERE id = $1',
        [id]
    );

    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    return user;
}

export async function updateUser(id, fields) {
    const allowed = ['name', 'street', 'city', 'postcode', 'country'];
    const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));

    if (updates.length === 0) {
        const error = new Error('User not found or no valid fields to update');
        error.statusCode = 400;
        throw error;
    }

    const setClauses = updates.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    const values = updates.map(([, v]) => v);

    const { rows: [user] } = await pool.query(
        `UPDATE users SET ${setClauses} WHERE id = $${values.length + 1} RETURNING id, name, street, city, postcode, country, created_at, last_updated`,
        [...values, id]
    );

    if (!user) {
        const error = new Error('User not found or no valid fields to update');
        error.statusCode = 400;
        throw error;
    }

    return user;
}

export async function deleteUser(id) {
    const { rows: [user] } = await pool.query(
        'DELETE FROM users WHERE id = $1 RETURNING id, name, street, city, postcode, country, created_at, last_updated',
        [id]
    );

    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    return user;
}
