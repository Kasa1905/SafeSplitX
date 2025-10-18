const successResponse = (res, data = null, message = 'OK', statusCode = 200) => {
  return res.status(statusCode).json({ 
    success: true, 
    message, 
    data, 
    timestamp: new Date().toISOString(), 
    requestId: res.req.requestId 
  });
};

const errorResponse = (res, message = 'Error', code = 'ERROR', details = null, statusCode = 400) => {
  return res.status(statusCode).json({ 
    success: false, 
    message, 
    code, 
    details, 
    timestamp: new Date().toISOString(), 
    requestId: res.req.requestId 
  });
};

const paginatedResponse = (res, data, pagination, message = 'OK') => {
  return res.status(200).json({ 
    success: true, 
    message, 
    data, 
    pagination, 
    timestamp: new Date().toISOString(), 
    requestId: res.req.requestId 
  });
};

module.exports = { successResponse, errorResponse, paginatedResponse };