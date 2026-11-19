function validateBody(requiredFields = []) {
  return (req, res, next) => {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        error: { message: 'Request body must be a valid JSON object or array' }
      });
    }

    const missing = [];
    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Missing required field(s): ${missing.join(', ')}`,
          missing_fields: missing
        }
      });
    }

    next();
  };
}

module.exports = {
  validateBody
};
