import { Router } from 'express';
const router = Router();


import { validateCredentials, validateUser } from '../controllers/auth.js';
import log from '../controllers/logger.js';

router.get('/login', (req, res) => {
    res.render('login/login', { layout: 'basic' });
});

router.post('/login', validateCredentials, (req, res) => {
    if (req.user) {
        res.redirect('/dashboard');
    } else {
        res.render('login/login', { layout: 'basic', error: "Τα στοιχεία σας δεν είναι σωστά. Παρακαλώ προσπαθήστε ξανά." });
    }
});

router.get('/userlogin', (req, res) => {
    res.render('login/userlogin', { layout: 'basic' });
});

router.get('/autologin', 
    (req, res, next) => {
        let username = req.query.user;
        let password = req.query.pass;
        if (!username || !password) {
            res.redirect('/login');
        } else {
            req.body ??= {};       // so req.body can't be undefined
            req.body.username = username;
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