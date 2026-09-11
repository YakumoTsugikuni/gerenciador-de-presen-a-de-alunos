const test = require('node:test');
const assert = require('node:assert/strict');
const rateLimit = require('../middleware/rateLimit');

function responseMock() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('bloqueia tentativas acima do limite e informa Retry-After', () => {
  const middleware = rateLimit({ windowMs: 60_000, max: 2 });
  const request = { path: '/login', ip: 'test-rate-limit' };
  const responses = [1, 2, 3].map(() => {
    const response = responseMock();
    let called = false;
    middleware(request, response, () => { called = true; });
    return { response, called };
  });

  assert.equal(responses[0].called, true);
  assert.equal(responses[1].called, true);
  assert.equal(responses[2].called, false);
  assert.equal(responses[2].response.statusCode, 429);
  assert.ok(responses[2].response.headers['Retry-After']);
});