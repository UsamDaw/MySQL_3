const bcrypt = require('bcryptjs');
const db = require('../db');
const { body, validationResult } = require('express-validator');

// Registrering av bruker
exports.registerUser = [
  // Validering av input
  body('brukernavn')
    .isLength({ min: 3, max: 20 }).withMessage('Brukernavn må vre mellom 3 og 20 tegn.')
    .matches(/^[a-zA-Z0-9]+$/).withMessage('Brukernavn kan kun inneholde alfanumeriske tegn.'),
  body('passord')
    .isLength({ min: 8 }).withMessage('Passordet må vre minst 8 tegn.')
    .matches(/[0-9]/).withMessage('Passordet må inneholde minst ett tall.')
    .matches(/[a-zA-Z]/).withMessage('Passordet må inneholde minst ett bokstavtegn.'),
  body('rolle')
    .isIn(['lrer', 'elev']).withMessage('Rolle må vre enten "lærer" eller "elev".'),

  // Håndtere registreringen etter validering
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'feil',
        message: 'Validering feilet',
        errors: errors.array()
      });
    }

    const { brukernavn, passord, rolle } = req.body;
    console.log('[REGISTRERING] Mottatt foresprsel:', { brukernavn, rolle });

    try {
      // Sjekk om brukernavnet allerede finnes
      const [existing] = await db.query('SELECT * FROM brukere WHERE brukernavn = ?', [brukernavn]);
      if (existing.length > 0) {
        return res.status(400).json({
          status: 'feil',
          message: 'Brukernavnet er allerede i bruk.'
        });
      }

      // Hash passordet
      const hashedPassword = await bcrypt.hash(passord, 10);
      console.log('[REGISTRERING] Passord hash fullfrt');

      // Sett inn i databasen
      await db.query(
        'INSERT INTO brukere (brukernavn, passord, rolle) VALUES (?, ?, ?)',
        [brukernavn, hashedPassword, rolle]
      );
      console.log('[REGISTRERING] Bruker registrert i databasen');

      res.status(201).json({
        status: 'suksess',
        message: 'Bruker registrert!',
        data: {
          brukernavn: brukernavn,
          rolle: rolle
        }
      });
    } catch (err) {
      console.error('[REGISTRERING] Serverfeil:', err);
      res.status(500).json({
        status: 'feil',
        message: 'Serverfeil ved registrering.',
        error: err.message // ekstra info til deg
      });
    }
  }
];

// Innlogging av bruker
exports.loginUser = async (req, res) => {
  const { brukernavn, passord } = req.body;
  console.log('[LOGIN] Mottatt innloggingsforsk for:', brukernavn);

  try {
    const [rows] = await db.query('SELECT * FROM brukere WHERE brukernavn = ?', [brukernavn]);
    const user = rows[0];

    if (!user) {
      return res.status(404).json({
        status: 'feil',
        message: 'Bruker ikke funnet.'
      });
    }

    const isMatch = await bcrypt.compare(passord, user.passord);
    if (!isMatch) {
      return res.status(401).json({
        status: 'feil',
        message: 'Feil passord.'
      });
    }

    res.status(200).json({
      status: 'suksess',
      message: 'Innlogging vellykket!',
      bruker: {
        id: user.id,
        brukernavn: user.brukernavn,
        rolle: user.rolle
      }
    });
  } catch (err) {
    console.error('[LOGIN] Serverfeil:', err);
    res.status(500).json({
      status: 'feil',
      message: 'Serverfeil ved innlogging.',
      error: err.message
    });
  }
};
