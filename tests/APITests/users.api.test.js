const http = require('http');
const express = require('express');

// The users router is CommonJS and simple; safe to require directly
const usersRouter = require('../../routes/users');

function httpGet(server, path = '/') {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const options = { hostname: addr.address === '::' ? '127.0.0.1' : addr.address, port: addr.port, path, method: 'GET' };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, text: data, headers: res.headers }));
    });
    req.on('error', reject);
    req.end();
  });
}

describe('REST API: /users/', () => {
  let app;
  let server;

  beforeAll((done) => {
    app = express();
    app.use('/users', usersRouter);
    server = app.listen(0, () => done());
  });

  afterAll((done) => {
    server.close(() => done());
  });

  test('GET /users/ returns 200 and expected text', () => {
    return httpGet(server, '/users/').then((res) => {
      expect(res.status).toBe(200);
      expect(res.text).toBe('respond with a resource');
      expect(res.headers['content-type']).toMatch(/text\/html|text\/plain/);
    });
  });
});
