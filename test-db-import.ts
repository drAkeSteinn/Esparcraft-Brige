import { db } from './src/lib/db.ts';

console.log('db object keys:', Object.keys(db));
console.log('db.pueblo:', db.pueblo ? 'exists' : 'undefined');
console.log('typeof db:', typeof db);
