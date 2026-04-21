import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/database/database.js', () => ({
    default: { query: vi.fn(), connect: vi.fn() }
}));

vi.mock('bcrypt', () => ({
    default: {
        hash: vi.fn().mockResolvedValue('hashed_password'),
        compare: vi.fn()
    }
}));

import { login, createUser, getUser, getUsers, searchUsers, updateUser, deleteUser } from '../../src/controllers/userController.js';
import pool from '../../src/database/database.js';
import bcrypt from 'bcrypt';

describe('userController', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('login', () => {
        it('throws 400 when name is missing', async () => {
            await expect(login(null, 'pass')).rejects.toMatchObject({ statusCode: 400 });
        });

        it('throws 400 when password is missing', async () => {
            await expect(login('alice', null)).rejects.toMatchObject({ statusCode: 400 });
        });

        it('throws 401 when user is not found', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(login('alice', 'wrongpass')).rejects.toMatchObject({ statusCode: 401 });
        });

        it('throws 401 when password does not match', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'alice', password_hash: 'hash', is_admin: false, email_verified: true }] });
            bcrypt.compare.mockResolvedValueOnce(false);
            await expect(login('alice', 'wrongpass')).rejects.toMatchObject({ statusCode: 401 });
        });

        it('returns a JWT token on valid credentials', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'alice', password_hash: 'hash', is_admin: false, email_verified: true }] });
            bcrypt.compare.mockResolvedValueOnce(true);

            const result = await login('alice', 'correctpass');
            expect(result).toHaveProperty('token');
            expect(typeof result.token).toBe('string');
        });
    });

    describe('createUser', () => {
        it('throws InputError when name is missing', async () => {
            await expect(createUser(null, 'pass', null, null, null, null, null, 'a@b.com'))
                .rejects.toMatchObject({ name: 'InputError' });
        });

        it('throws InputError when password is missing', async () => {
            await expect(createUser('alice', null, null, null, null, null, null, 'a@b.com'))
                .rejects.toMatchObject({ name: 'InputError' });
        });

        it('throws InputError when email is missing', async () => {
            await expect(createUser('alice', 'pass', null, null, null, null, null, null))
                .rejects.toMatchObject({ name: 'InputError' });
        });

        it('throws 409 when email is already in use', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 99 }] });
            await expect(createUser('alice', 'pass', null, null, null, null, null, 'taken@b.com'))
                .rejects.toMatchObject({ statusCode: 409 });
        });

        it('creates user and returns id, name, email', async () => {
            const user = { id: 1, name: 'alice', email: 'a@b.com' };
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [user] });

            const result = await createUser('alice', 'pass', null, null, null, null, null, 'a@b.com');
            expect(result).toEqual(user);
            expect(bcrypt.hash).toHaveBeenCalledWith('pass', 10);
        });

        it('passes all optional fields to the INSERT query', async () => {
            const user = { id: 2, name: 'bob', email: 'b@b.com' };
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [user] });

            await createUser('bob', 'pass', '1 St', 'Sydney', '2000', 'AU', 'A bio', 'b@b.com');
            const insertCall = pool.query.mock.calls[1];
            expect(insertCall[1]).toContain('bob');
            expect(insertCall[1]).toContain('1 St');
            expect(insertCall[1]).toContain('Sydney');
        });
    });

    describe('getUser', () => {
        it('returns the user when found', async () => {
            const user = { id: 1, name: 'alice', email: 'a@b.com', email_verified: true };
            pool.query.mockResolvedValueOnce({ rows: [user] });

            const result = await getUser(1);
            expect(result).toEqual(user);
            expect(pool.query.mock.calls[0][1]).toEqual([1]);
        });

        it('throws 404 when user does not exist', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(getUser(999)).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('getUsers', () => {
        it('returns all users', async () => {
            const users = [{ id: 1, name: 'alice' }, { id: 2, name: 'bob' }];
            pool.query.mockResolvedValueOnce({ rows: users });

            const result = await getUsers();
            expect(result).toEqual(users);
        });

        it('throws 404 when no users exist', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(getUsers()).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('searchUsers', () => {
        it('returns matching users', async () => {
            const users = [{ id: 1, name: 'alice', logo_url: null, bio: null }];
            pool.query.mockResolvedValueOnce({ rows: users });

            const result = await searchUsers('alic');
            expect(result).toEqual(users);
            expect(pool.query.mock.calls[0][1]).toEqual(['%alic%']);
        });

        it('returns empty array when no matches', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const result = await searchUsers('zzz');
            expect(result).toEqual([]);
        });
    });

    describe('updateUser', () => {
        it('throws 400 when no valid fields provided', async () => {
            await expect(updateUser(1, { invalid_field: 'x' })).rejects.toMatchObject({ statusCode: 400 });
        });

        it('throws 400 when user not found', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(updateUser(999, { name: 'New Name' })).rejects.toMatchObject({ statusCode: 400 });
        });

        it('updates user with allowed fields', async () => {
            const updated = { id: 1, name: 'New Name', city: 'Sydney' };
            pool.query.mockResolvedValueOnce({ rows: [updated] });

            const result = await updateUser(1, { name: 'New Name', city: 'Sydney' });
            expect(result.name).toBe('New Name');
        });

        it('ignores disallowed fields like password', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await expect(updateUser(1, { password: 'hack' })).rejects.toMatchObject({ statusCode: 400 });
        });
    });

    describe('deleteUser', () => {
        it('throws 404 when user does not exist', async () => {
            const mockClient = {
                query: vi.fn()
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce({ rows: [] })
                    .mockResolvedValueOnce(undefined),
                release: vi.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            await expect(deleteUser(999)).rejects.toMatchObject({ statusCode: 404 });
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('soft-deletes user, products, and cancels orders', async () => {
            const user = { id: 1, name: 'alice' };
            const mockClient = {
                query: vi.fn()
                    .mockResolvedValueOnce(undefined)           // BEGIN
                    .mockResolvedValueOnce({ rows: [user] })    // SELECT user
                    .mockResolvedValueOnce({ rows: [] })        // UPDATE users SET is_active = false
                    .mockResolvedValueOnce({ rows: [] })        // UPDATE products SET is_active = false
                    .mockResolvedValueOnce({ rows: [] })        // SELECT products (none → skip order logic)
                    .mockResolvedValueOnce({ rows: [] })        // UPDATE orders (buyer orders)
                    .mockResolvedValueOnce(undefined),          // COMMIT
                release: vi.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            const result = await deleteUser(1);
            expect(result).toMatchObject({ id: 1, is_active: false });
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('rolls back transaction on error', async () => {
            const mockClient = {
                query: vi.fn()
                    .mockResolvedValueOnce(undefined)
                    .mockRejectedValueOnce(new Error('db error')),
                release: vi.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            await expect(deleteUser(1)).rejects.toThrow('db error');
            const calls = mockClient.query.mock.calls.map(c => c[0]);
            expect(calls).toContain('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });
    });
});
