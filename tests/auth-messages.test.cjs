const assert = require('node:assert/strict');
const { test } = require('node:test');
const { authErrorMessage, validateCredentials } = require('../src/features/auth/messages.ts');

test('invalid credentials explains both possible causes without claiming the email exists', () => {
  const message = authErrorMessage({ code: 'invalid_credentials' });
  assert.match(message, /chưa đăng ký/);
  assert.match(message, /mật khẩu chưa đúng/);
  assert.match(message, /Tạo tài khoản/);
});

test('confirmation, missing account and connectivity get distinct instructions', () => {
  assert.match(authErrorMessage({ code: 'user_not_found' }), /chưa được đăng ký/);
  assert.match(authErrorMessage({ code: 'email_not_confirmed' }), /chưa được xác nhận/);
  assert.match(authErrorMessage({ name: 'AuthRetryableFetchError' }), /kết nối mạng/);
  assert.match(authErrorMessage({ status: 429 }), /chờ một lát/);
  assert.doesNotMatch(authErrorMessage(new Error('internal secret detail')), /secret/);
});

test('missing and invalid inputs are explained and password minimum only applies to signup', () => {
  assert.match(validateCredentials('', '', false), /chưa nhập email/);
  assert.match(validateCredentials('invalid', 'abcdef', false), /định dạng/);
  assert.match(validateCredentials('a@example.com', '', false), /chưa nhập mật khẩu/);
  assert.match(validateCredentials('a@example.com', 'abc', true), /ít nhất 6/);
  assert.equal(validateCredentials(' a@example.com ', 'abc', false), null);
  assert.equal(validateCredentials('a@example.com', 'abcdef', true), null);
});
