import { Router } from 'express';
const router = Router();


import { validateCredentials } from '../controllers/auth.js';
import { createAndSendMagicLink } from '../controllers/email.js';
// import log from '../controllers/logger.js';

const tokenCookieName = process.env.TOKENCOOKIENAME;


router.get('/login', (req, res) => {
    // Αν υπάρχει token στο URL (magic link), διαγράφουμε το παλιό cookie
    if (req.query[tokenCookieName]) {
        res.clearCookie(tokenCookieName);
    }
    res.render('login/login', { 
            layout: 'basic', 
            tokenCookieName,
            environment: process.env.NODE_ENV,
        });
});

router.get('/userlogin', (req, res) => {
    res.render('login/userlogin', { layout: 'basic' });
});

router.post('/userlogin', validateCredentials, (req, res) => {
    if (req.user) {
        res.redirect('/dashboard');
    } else {
        res.render('login/userlogin', { layout: 'basic', error: "Τα στοιχεία σας δεν είναι σωστά. Παρακαλώ προσπαθήστε ξανά." });
    }
});

router.post('/magiclink', async (req, res) => {
    let email = req.body.email;
    let magicLink = await createAndSendMagicLink(email);
    if (magicLink) {    // είτε βρέθηκε ο χρήστης, είτε όχι (magicLink=false μόνο αν έγινε σφάλμα)
        if (process.env.SENDACTUALEMAILS === 'false'){
            res.status(200).send(magicLink);
        } else {
            res.status(200).send( `
                <div class="alert alert-success text-center" role="alert">
                    O σύνδεσμος για την είσοδο στην Εφαρμογή έχει σταλεί στο email σας. Μπορείτε να κλείσετε αυτό το παράθυρο.
                </div>
            ` );
            return;
        }
    } else {
        res.status(404).send( `
            <div class="alert alert-danger text-center" role="alert">
                Υπήρξε σφάλμα κατά την αποστολή του email. Παρακαλώ προσπαθήστε ξανά αργότερα.
            </div>
        ` );
    }
});

router.get('/autologin', 
    (req, res, next) => {
        let email = req.query.email;
        let password = req.query.pass;
        if (!email || !password) {
            res.redirect('/login');
            return;  // όχι next()
        } else {
            req.body ??= {};       // so req.body can't be undefined
            req.body.email = email;
            req.body.password = password;
        }
        next();
    },
    validateCredentials,
    (req, res) => {
        if (req.user){
            res.redirect('/dashboard');
        }
        else {
            res.render("login/login", {layout: 'basic', error: "Τα στοιχεία σας δεν είναι σωστά. Παρακαλώ προσπαθήστε ξανά."});
        }
    }
);

router.get('/logout', (req, res) => {
    // delete cookie
    res.clearCookie(tokenCookieName);
    res.redirect('/login');
});


export default router;