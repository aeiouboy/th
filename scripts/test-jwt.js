const jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');

const client = jwksRsa({
  jwksUri: 'https://lchxtkiceeyqjksganwr.supabase.co/auth/v1/.well-known/jwks.json',
  cache: true,
});

const token = process.argv[2];
if (!token) { console.error('Usage: node test-jwt.js <token>'); process.exit(1); }

console.log('Token length:', token.length);
const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
console.log('JWT Header:', header);

jwt.verify(token, (hdr, callback) => {
  console.log('Looking up kid:', hdr.kid);
  client.getSigningKey(hdr.kid, (err, key) => {
    if (err) { console.error('JWKS error:', err.message); return callback(err); }
    console.log('Got key alg:', key.alg || key.rsaPublicKey ? 'RSA' : 'EC');
    callback(null, key.getPublicKey());
  });
}, { algorithms: ['ES256', 'RS256'] }, (err, decoded) => {
  if (err) console.error('Verify FAILED:', err.message);
  else console.log('Verify SUCCESS! sub:', decoded.sub, 'role:', decoded.role);
});
