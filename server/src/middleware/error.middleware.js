export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: 'API route not found',
    errorCode: 'NOT_FOUND'
  });
}

export function errorHandler(err, req, res, _next) {
  const status = Number.isInteger(err?.status) ? err.status : 500;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) console.error(err);

  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'Uploaded file exceeds the configured size limit.',
      errorCode: 'FILE_TOO_LARGE'
    });
  }

  if (err?.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid multipart upload.',
      errorCode: 'UPLOAD_ERROR'
    });
  }

  const message = status >= 500 && isProduction
    ? 'Internal server error'
    : (err?.message || 'Internal server error');

  return res.status(status).json({
    success: false,
    message,
    errorCode: err?.errorCode || 'INTERNAL_ERROR'
  });
}
