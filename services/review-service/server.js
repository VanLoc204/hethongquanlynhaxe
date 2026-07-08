const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'review-service' });
});

app.listen(PORT, () => {
  console.log(`${'review-service'.toUpperCase()} is running on port ${PORT}`);
});
