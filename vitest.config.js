import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['tests/**/*.test.js'],
        // Tests sign tokens with the development secret; dotenv never overrides variables
        // that are already set, so a developer's local .env cannot break the suite.
        env: {
            JWT_SECRET: 'dev-secret-change-in-production',
        },
        coverage: {
            provider: 'v8',
            include: ['src/**/*.js'],
            // server.js only binds the port; everything else is exercised through app.js
            exclude: ['src/server.js'],
            reporter: ['text-summary', 'lcov'],
        },
    },
});
