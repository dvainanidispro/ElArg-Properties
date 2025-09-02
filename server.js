////////////////////  INITIALIZATION  ////////////////////


console.log('Initializing server...');

import express from 'express';
import handlebarsEngine from './config/handlebars.js';
import cookieParser from 'cookie-parser';
import log from './controllers/logger.js';
// import Models from './models/models.js';

const server = express();
server.set('trust proxy', 1);

server.engine('hbs', handlebarsEngine);
server.set('view engine', 'hbs');
server.set('views', 'views');

server.use(express.static('public'));
server.use(express.urlencoded({ extended: true }));
server.use(express.json());
server.use(cookieParser());



////////////////////   MIDDLEWARE AND FUNCTIONS   ////////////////////

import { presentTime } from './controllers/utils.js';
import { validateUser } from './controllers/auth.js';



/////////////////        ΕΛΕΥΘΕΡΑ ROUTES      /////////////////


server.get('/status', (req, res) => {
   res.status(200).send('OK');
});


server.get('/404', (req, res) => {
   res.status(404).render('errors/404');
});


//* Login routes
import loginRouter from './routes/login.js';
server.use(loginRouter);


///////////////// ROUTES ΜΟΝΟ ΓΙΑ ΠΙΣΤΟΠΟΙΗΜΕΝΟΥΣ ΧΡΗΣΤΕΣ /////////////////

server.use(validateUser);

// Αρχική σελίδα
server.get('/', (req, res) => {
    if (req.user){
        res.render('dashboard');
    } else {
        res.render('login', { layout: false, error: null });
    }
});

server.get('/dashboard', (req, res) => {
   res.render('dashboard', { user: req.user });
});



///////////////////////////////////         THE SERVER         /////////////////////////////////////

async function startServer(){
    let port = process.env.PORT??80;
    let listeningURL = process.env.LISTENINGURL??'http://localhost';
    server.listen(port, () => {
        log.system(`Express server is listening at ${listeningURL}:${port}. Started at ${presentTime()}.`);
    });
}
startServer();