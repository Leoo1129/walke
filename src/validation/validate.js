import { z } from 'zod';

// Validate req.body against a zod schema and replace it with the parsed (trimmed, typed) value.
export function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body ?? {});
        if (!result.success) {
            return res.status(400).json(formatIssues(result.error));
        }
        req.body = result.data;
        next();
    };
}

// Reject non-numeric route ids with a 400 before they reach Postgres (which would otherwise
// throw "invalid input syntax for type integer" and surface as a 500). Use with router.param().
export function validateIdParam(req, res, next, value, name) {
    if (!/^[1-9]\d{0,9}$/.test(value)) {
        return res.status(400).json({ error: `${name} must be a positive integer` });
    }
    next();
}

function formatIssues(error) {
    const details = error.issues.map(issue => ({
        field: issue.path.join('.') || null,
        message: issue.message,
    }));
    const first = details[0];
    return {
        error: first.field ? `${first.field}: ${first.message}` : first.message,
        details,
    };
}

export { z };
