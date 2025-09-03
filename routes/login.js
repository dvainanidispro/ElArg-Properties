import { Router } from 'express';
const router = Router();


import { validateCredentials, validateUser, createMagicLink } from '../controllers/auth.js';
import log from '../controllers/logger.js';




router.get('/login', (req, res) => {
    res.render('login/login', { layout: 'basic' });
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
    let magicLink = await createMagicLink(email);
    if (magicLink) {
        // Send the magic link to the user's email
        res.status(200).send( magicLink );
    } else {
        res.status(404).json({ message: "User not found." });
    }
});

router.get('/autologin', 
    (req, res, next) => {
        let email = req.query.email;
        let password = req.query.pass;
        if (!email || !password) {
            res.redirect('/login');
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
            res.render("login", {layout: false, error: "Τα στοιχεία σας δεν είναι σωστά. Παρακαλώ προσπαθήστε ξανά."});
        }
    }
);


export default router;