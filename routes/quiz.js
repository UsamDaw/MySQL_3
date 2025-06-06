const express = require('express');
const router = express.Router();
const {
  opprettQuiz,
  leggTilsprsml,  // Changed to match the actual exported function name
  hentAlleQuizer,
  hentsprsmlForQuiz  // Also changed this to match the actual function name
} = require('../controllers/quizController');

router.post('/opprett', opprettQuiz);                // Kun for lærere
router.post('/sprsml', leggTilsprsml);  // Changed from leggTilSprsml to leggTilsprsml           // Kun for lærere
router.get('/', hentAlleQuizer);
router.get('/:quizId/sprsml', hentsprsmlForQuiz);  // Changed from hentSprsmlForQuiz to hentsprsmlForQuiz
router.post('/besvarelse', require('../controllers/quizController').lagreBesvarelse);
router.post('/svar', require('../controllers/quizController').lagreElevSvar);
router.post('/vurder', require('../controllers/quizController').vurderQuiz);
router.post('/resultater/:quizId', require('../controllers/quizController').hentResultaterForQuiz); // for lærere
router.post('/progresjon/:elevId', require('../controllers/quizController').elevProgresjon);       // for elever

module.exports = router;