const jwt = require('jsonwebtoken');

// Replace 'your_jwt_secret' with your actual secret key
const secretKey = 'your_jwt_secret';

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2YjFiNDYzYjRlOWM2OThjOWJkZmY4YSIsInJvbGxObyI6IjIxNDcxQTA1SzQiLCJpYXQiOjE3MjMwMDY0NTAsImV4cCI6MTcyMzAxMDA1MH0.naU1SCDG2VmS_K4-QJ5t0yEfOV3yTQbWz0kbkrku13A"
// Replace with the token you have

try {
  const decoded = jwt.decode(token);
  console.log('Decoded payload:', decoded);
} catch (error) {
  console.error('Error decoding token:', error);
}