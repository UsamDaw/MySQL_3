const express = require('express');
const router = express.Router();
const {
  opprettQuiz,
  leggTilSpørsmål,
  hentAlleQuizer,
  hentSpørsmålForQuiz
} = require('../controllers/quizController');

router.post('/opprett', opprettQuiz);                // Kun for lærere
router.post('/spørsmål', leggTilSpørsmål);           // Kun for lærere
router.get('/', hentAlleQuizer);
router.get('/:quizId/spørsmål', hentSpørsmålForQuiz);
router.post('/besvarelse', require('../controllers/quizController').lagreBesvarelse);
router.post('/svar', require('../controllers/quizController').lagreElevSvar);
router.post('/vurder', require('../controllers/quizController').vurderQuiz);
router.post('/resultater/:quizId', require('../controllers/quizController').hentResultaterForQuiz); // for lærere
router.post('/progresjon/:elevId', require('../controllers/quizController').elevProgresjon);       // for elever

module.exports = router;