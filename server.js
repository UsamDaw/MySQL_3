const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quiz');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);

app.get('/api/quiz/test/:id/sprsml', (req, res) => {
  res.json({ id: req.params.id, test: true });
});

app.listen(PORT, () => {
  console.log(`Server kjører på http://localhost:${PORT}`);
});
