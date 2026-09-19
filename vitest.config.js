import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['tests/**/*.test.js'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.js'],
            // server.js only binds the port; everything else is exercised through app.js
            exclude: ['src/server.js'],
            reporter: ['text-summary', 'lcov'],
        },
    },
});
