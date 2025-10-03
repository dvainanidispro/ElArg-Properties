import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import ms from 'ms';
import log from './logger.js';
import Models from '../models/models.js';
// import { Op } from 'sequelize';


/////////////////////////////         CONFIGURATION         /////////////////////////////

// Σημείωση. Επειδή το Access Token χρησιμοποιεί δευτερόλεπτα, η μονάδα μέτρησης χρόνου σε αυτό το αρχείο να είναι τα δευτερόλεπτα. 

/** Το μυστικό string για την δημιουργία και επαλήθευση του Access Token */
const jwtsecret = process.env.JWTSECRET;
/** Το όνομα του cookie που περιέχει το Access Token */
const cookieName = process.env.TOKENCOOKIENAME;
/** Tο path στο οποίο στέλνουμε τον μη πιστοποιημένο χρήστη ώστε να βάλει email & password. */
const loginpath = "/login";
/** Δεν εφαρμόζεται. Τα paths τα οποία δεν ΠΡΟαπαιτούν authentication για την χρήση τους από το χρήστη. Τα περιεχόμενα του φάκελου public δεν περιλαμβάνονται */
const freepaths = ["/login", "/autologin", "/userlogin", '/magiclink', "/status", "/404", ];

/**
 * Επιστρέφει true αν το path ταιριάζει με κάποιο pattern του freepaths (υποστηρίζει * στο τέλος)
 */
function isFreePath(path) {
    return freepaths.some(pattern => {
        if (pattern.endsWith('/*')) {
            const base = pattern.slice(0, -1); // αφαιρεί το *
            return path.startsWith(base);
        }
        return path === pattern;
    });
}

/** Το audience του Access Token. Εδω, χρησιμοποιείται και ως aud και ως iss */
let aud, iss;
aud = iss = process.env.LISTENINGDOMAIN || "localhost";
/** H διάρκεια του Token σε string */
const tokenExpirationTime = process.env.TOKENEXPIRATIONTIME;
/** H διάρκεια του Magic Link Token σε string */
const linkExpirationTime = process.env.LINKEXPIRATIONTIME;
/** Το χρονικό διάστημα πριν τη λήξη του token κατά το οποίο το token πρέπει να ανανεωθεί, σε δευτερόλεπτα */
const tokenRefreshThreshold = ms(process.env.TOKENREFRESHTHRESHOLD)/1000;
/** Τα options του Access Token cookie */
const cookieOptions = { 
    httpOnly: true, 
    secure: (process.env.TOKENHTTPS=="false")?false:true, 
    sameSite: 'lax',    // Αν βάλω 'strict', δεν δουλεύουν τα cookies από link σε email.
    maxAge: ms(tokenExpirationTime),
};



/////////////////////////////    HASHING AND VALIDATING PASSWORD    /////////////////////////////

/**
 * Κρυπτογραφεί ένα password με SHA-256 hashing και τυχαίο salt
 * @param {string} password - Το password προς κρυπτογράφηση
 * @returns {string} Το hashed password με salt (μορφή: salt:hash)
 */
const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256').update(salt + password).digest('hex');
    return `${salt}:${hash}`;
};

/**
 * Ελέγχει αν το password ταιριάζει με το hashedPassword (μορφή: salt:hash). Επιστρέφει true ή false.
 * @param {string} password - Το password προς έλεγχο
 * @param {string} hashedPassword - Το αποθηκευμένο hash με salt
 * @returns {boolean}
 */
let validatePassword = (password, hashedPassword) => {
    const [salt, hash] = hashedPassword.split(':');
    if (!salt || !hash) return false;
    const hashToCompare = crypto.createHash('sha256').update(salt + password).digest('hex');
    return hashToCompare === hash;
};



/////////////////////////////    FUNCTIONS & MIDDLEWARE    /////////////////////////////


/** Ελέγχει το email και το password του χρήστη σύμφωνα με αυτά που υπάρχουν στη Βάση και επιστρέφει το χρήστη */
let getUserFromDatabaseByCredentials = async (email, password) => {

    let user = await Models.User.findOne({
        where: {email: email},
        // case sensitive! for case insensitive comparison use:
        // where { username: { [Op.iLike]: username } }
        // For PostgreSQL; for other DBs use:  username: { [Op.like]: username.toLowerCase() }
        // include: {model: Models.Speaker, as: 'speaker'},
        raw: true,          // Επιστρέφει τα αποτελέσματα ως JSON
        nest : true,        // το Speaker να είναι αντικείμενο μέσα στο user 
    });
    if (!user) return false;
    // log.dev({user});

    // let passwordMatch = (password === user.password);
    let passwordMatch = validatePassword(password, user.password);
    if (passwordMatch) {return user}
    else {return false}
};

/** Δημιουργεί το Access Token του χρήστη */
let createAccessToken = (user, forMagicLink=false) => {
    return jwt.sign({
        iss: iss,      // the URL of the AUTH server (https://auth.example.com/)
        sub: user.id,   // The user id
        aud: aud,       // The URL of the API server (https://api.example.com/)
        username: user.username,
        email: user?.email??null,
        name: user.name,
        role: user?.role??null,
        // scope: "read:messages write:messages",
        // customClaims: {  },  // name, email, username, roles, permissions
    }, jwtsecret, {expiresIn: forMagicLink ? linkExpirationTime : tokenExpirationTime});
};

/** Ανανεώνει το Access Token του χρήστη, με δεδομένο το παλιό του token */
let renewAccessToken = (oldDecodedToken) => {
    let { exp, iat, ...newToken } = oldDecodedToken;     // το newToken είναι το oldDecodedToken χωρίς τα exp and iat
    return jwt.sign(newToken, jwtsecret, {expiresIn: tokenExpirationTime});
};



/** Ελέγχει το email και το password που πληκτρολόγησε ο χρήστης στη φόρμα και του στέλει το Access Token σε Cookie */
let validateCredentials = async (req, res, next) => {
    let body = req.body;
    let user = await getUserFromDatabaseByCredentials(body.email,body.password);
    if (user) {
        /** To JWT Token που θα σταλεί στον χρήστη */
        let token = createAccessToken(user);
        res.cookie(cookieName, token, cookieOptions);
        req.user = user;
    } else {
        log.warn(`Wrong email/password: ${body.email} ${body.password} `);
    }
    next();
};




/** 
 * Middleware το οποίο ελέγχει ότι ο χρήστης είναι έγκυρος με βάση το Access Token που έστειλε. 
 * Δημουργεί τα req.user (για τα middleware) και res.locals.user (για το view).
 * Αν πρόκειται να λήξει, το ανανεώνει. 
 * Αν δεν είναι έγκυρος, τον στέλνει στο loginpath. Εξαιρούνται free paths.
 */
let validateUser = (req, res, next) => {
    // log.dev(`Request: ${req.method} ${req.path} `);
    // log.dev(req.cookies.token);

    /** Ελέγχει αν το path είναι ελεύθερο και αν ναι, αφήνει το χρήστη να συνεχίσει, αλλιώς τον οδηγεί στο loginpath */
    let handleLoggedOffUser = () => {
        if ( isFreePath(req.path) ) {
            next();
            return;
        } else {    // Αν όχι, στέλνουμε τον χρήστη στο login
            res.redirect(loginpath);
        }
    }

    /** Το Access Token του χρήστη */
    let token = req.cookies?.[cookieName];
    // log.dev(`Access Token: ${token}`);
    if (token) {         // Επαλήθευση του Access Token (σε κάθε path)
        jwt.verify(
            token, 
            jwtsecret, 
            {audience: aud, issuer: iss}, 
            (failure, decodedToken) => {
                if ( failure ) {    // Λάθος token ή ληγμένο token (ο χρήστης δεν είναι logged-in)
                    // log.dev(`Invalid or expired token: ${token}`);
                    res.locals.error = 'Η σύνδεσή σας έχει λήξει. Παρακαλώ συνδεθείτε ξανά.';
                    handleLoggedOffUser();
                }
                else {  // Το access token είναι ΟΚ και ο χρήστης είναι logged-in.

                    // Αν το token λήγει, να ανανεωθεί.
                    /** O χρόνος που απομένει πριν τη λήξη του token σε δευτερόλεπτα */
                    const timeLeft = decodedToken.exp - Math.floor(Date.now()/1000);
                    if (timeLeft < tokenRefreshThreshold) {
                        res.cookie(cookieName, renewAccessToken(decodedToken), cookieOptions);
                    }

                    // Αποθήκευση του χρήστη στο req.user και res.locals.user
                    req.user = decodedToken;            // για middleware
                    res.locals.user = decodedToken;     // για view
                    // log.dev(req.user);
                    next();
                }
            }
        );
    }
    else {  // Αν δεν υπάρχει Access Token
        // log.dev('No token provided');
        res.locals.error = 'Θα πρέπει να συνδεθείτε για να συνεχίσετε στην εφαρμογή.';
        handleLoggedOffUser();
    }
};




export { validateCredentials, validateUser, hashPassword, createAccessToken };
