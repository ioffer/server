import {ApolloError} from "apollo-server-express";
import {v4} from "uuid";

export const formatError = (err) => {
  console.log('err:', JSON.stringify(err));
  console.log('Error name:', err.extensions.code);
  if (err.extensions.code === 'UNAUTHENTICATED') {
    console.log('❌ => UNAUTHENTICATED');
    return {
      message: 'Authentication Must Be Provided',
      code: 401,
    };
  } else if (err.message.startsWith('Database Error')) {
    console.log('❌ => DataBase Error');
    return {
      message: 'Database Error',
      code: 500,
    };
  } else if (err.extensions.exception.name === 'ValidationError') {
    console.log('❌ => ValidationError', JSON.stringify(err));
    console.log('err.extensions.exception.errors:', err.extensions.exception.errors);
    if (err.extensions.exception.errors.length <= 1) {
      return {
        message: err.extensions.exception.errors[0],
        code: 500,
      };
    } else {
      return {
        message: 'Multiple errors occurred',
        errors: err.extensions.exception.errors.map((err) => ({
          message: err,
          code: 500,
        })),
      };
    }
  } else if (err.extensions.code === 'GRAPHQL_VALIDATION_FAILED') {
    console.log('❌ => GRAPHQL_VALIDATION_FAILED');
    return {
      message: err.message,
      code: 400,
    };
  } else if (err.originalError instanceof ApolloError) {
    console.log('❌ => Apollo error');
    return err;
  } else {
    console.log('❌ => Server Error');
    const errId = v4();
    console.log('errId: ', errId);
    console.error('error:', err);
    console.error('errorArray:', err.extensions.exception.stacktrace);
    return {
      message: 'Internal Server Error: ' + errId,
      code: 500,
    };
    // return err
  }
}

export const expressErrorHandler = (err, req, res, next)=> {
  const {message, status} = err;
  const isDevelopment = req.app.get('env') === 'development';

  res.locals.message = message;
  res.locals.error = isDevelopment ? err : {};

  res.status(status || 500);

  if (isDevelopment) {
    // Render error details in development
    res.json({
      error: {
        message,
        stack: err.stack,
      },
    });
  } else {
    // Render a user-friendly error page in production
    res.render('error');
  }
}
