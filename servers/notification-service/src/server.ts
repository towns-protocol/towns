import express from 'express';

const app = express();
const port = 3030;

app.get('/', (req, res) => {
  res.send('notification service!');
});

app.listen(port, () => {
  console.log(`notification service is running at http://localhost:${port}`);
});
