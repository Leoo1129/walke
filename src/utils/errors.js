// An error that carries the HTTP status the API should respond with.
export class HttpError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.name = 'HttpError';
        this.statusCode = statusCode;
    }
}

// Invalid or missing request input (400).
export class InputError extends HttpError {
    constructor(message) {
        super(400, message);
        this.name = 'InputError';
    }
}
