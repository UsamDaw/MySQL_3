const db = require('../db');

exports.opprettQuiz = async (req, res) => {
  const { lærer_id, quiz_navn } = req.body;

  try {
    const [result] = await db.query(
      'INSERT INTO quiz (lærer_id, quiz_navn) VALUES (?, ?)',
      [lærer_id, quiz_navn]
    );
    res.status(201).json({ message: 'Quiz opprettet', quizId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Feil ved opprettelse av quiz' });
  }
};

exports.leggTilSpørsmål = async (req, res) => {
  const { quiz_id, spørsmålstekst, riktig_svar, feil_svar_1, feil_svar_2, feil_svar_3 } = req.body;

  try {
    await db.query(
      'INSERT INTO spørsmål (quiz_id, spørsmålstekst, riktig_svar, feil_svar_1, feil_svar_2, feil_svar_3) VALUES (?, ?, ?, ?, ?, ?)',
      [quiz_id, spørsmålstekst, riktig_svar, feil_svar_1, feil_svar_2, feil_svar_3]
    );
    res.status(201).json({ message: 'Spørsmål lagt til' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Feil ved lagring av spørsmål' });
  }
};

exports.hentAlleQuizer = async (req, res) => {
  try {
    const [quizer] = await db.query('SELECT * FROM quiz');
    res.status(200).json(quizer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Kunne ikke hente quizer' });
  }
};

exports.hentSpørsmålForQuiz = async (req, res) => {
    const { quizId } = req.params;
  
    try {
      const [spørsmål] = await db.query('SELECT * FROM spørsmål WHERE quiz_id = ?', [quizId]);
      const [quizinfo] = await db.query('SELECT tidsgrense_minutter FROM quiz WHERE id = ?', [quizId]);
  
      res.status(200).json({
        spørsmål,
        tidsgrense: quizinfo[0]?.tidsgrense_minutter || 0
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Kunne ikke hente spørsmål' });
    }
  };
  

  exports.lagreBesvarelse = async (req, res) => {
    const { elev_id, quiz_id } = req.body;
  
    try {
      const [result] = await db.query(
        'INSERT INTO besvarelser (elev_id, quiz_id) VALUES (?, ?)',
        [elev_id, quiz_id]
      );
  
      const besvarelseId = result.insertId;
  
      // Hent tidsgrense
      const [quiz] = await db.query('SELECT tidsgrense_minutter FROM quiz WHERE id = ?', [quiz_id]);
      const minutter = quiz[0]?.tidsgrense_minutter || 0;
  
      if (minutter > 0) {
        setTimeout(async () => {
          try {
            const [r] = await db.query(
              'SELECT COUNT(*) AS riktige FROM elevsvar WHERE besvarelse_id = ? AND er_riktig = TRUE',
              [besvarelseId]
            );
  
            const poengsum = r[0].riktige;
  
            // Sjekk om vurdering allerede finnes (unngå dobbel retting)
            const [eksisterende] = await db.query(
              'SELECT * FROM resultat WHERE besvarelse_id = ?',
              [besvarelseId]
            );
  
            if (eksisterende.length === 0) {
              await db.query(
                'INSERT INTO resultat (besvarelse_id, poengsum) VALUES (?, ?)',
                [besvarelseId, poengsum]
              );
              console.log(`Quiz ${besvarelseId} ble automatisk rettet etter ${minutter} minutter.`);
            }
  
          } catch (err) {
            console.error('Feil ved automatisk retting:', err);
          }
        }, minutter * 60 * 1000); // konverter til millisekunder
      }
  
      res.status(201).json({ message: 'Besvarelse startet', besvarelseId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Feil ved lagring av besvarelse' });
    }
  };
  
  
  exports.lagreElevSvar = async (req, res) => {
    const { besvarelse_id, spørsmål_id, gitt_svar, riktig_svar } = req.body;
    const er_riktig = gitt_svar === riktig_svar;
  
    try {
      await db.query(
        'INSERT INTO elevsvar (besvarelse_id, spørsmål_id, gitt_svar, er_riktig) VALUES (?, ?, ?, ?)',
        [besvarelse_id, spørsmål_id, gitt_svar, er_riktig]
      );
      res.status(201).json({ message: 'Elevsvar lagret', er_riktig });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Feil ved lagring av elevsvar' });
    }
  };
  
  exports.vurderQuiz = async (req, res) => {
    const { besvarelse_id } = req.body;
  
    try {
      const [svar] = await db.query(
        'SELECT COUNT(*) AS riktige FROM elevsvar WHERE besvarelse_id = ? AND er_riktig = TRUE',
        [besvarelse_id]
      );
  
      const poengsum = svar[0].riktige;
  
      await db.query(
        'INSERT INTO resultat (besvarelse_id, poengsum) VALUES (?, ?)',
        [besvarelse_id, poengsum]
      );
  
      res.status(200).json({ message: 'Quiz vurdert', poengsum });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Feil ved vurdering' });
    }
  };

  exports.hentResultaterForQuiz = async (req, res) => {
    const { quizId } = req.params;
    console.log('quizId:', quizId);

    try {
      const [resultater] = await db.query(`
        SELECT b.id AS besvarelse_id, u.brukernavn, r.poengsum, b.fullført_dato
        FROM resultat r
        JOIN besvarelser b ON r.besvarelse_id = b.id
        JOIN brukere u ON b.elev_id = u.id
        WHERE b.quiz_id = ?
      `, [quizId]);
  
      res.status(200).json(resultater);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Kunne ikke hente resultater' });
    }
  };
  
  exports.elevProgresjon = async (req, res) => {
    const { elevId } = req.params;
  
    try {
      const [progresjon] = await db.query(`
        SELECT q.quiz_navn, r.poengsum, b.fullført_dato
        FROM resultat r
        JOIN besvarelser b ON r.besvarelse_id = b.id
        JOIN quiz q ON b.quiz_id = q.id
        WHERE b.elev_id = ?
      `, [elevId]);
  
      res.status(200).json(progresjon);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Kunne ikke hente progresjon' });
    }
  };
  