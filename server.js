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

import { db, databaseConnectionTest } from './config/database.js';
import Models from './models/models.js';



/////////////////        ΕΛΕΥΘΕΡΑ ROUTES      /////////////////


server.get(['/status', '/health'], async (req, res) => {
    let infoText = `Web server: OK<br>`;
    try {  
        await db.authenticate();    // ώστε να μην κάνει console log
        infoText += `Database connection: OK`;
        res.status(200).send(infoText);
    } catch (error) {
        infoText += `Database connection: FAILED!`;
        log.error(`Database connection test failed: ${error}`);
        res.status(500).send(infoText);
    }
     //TODO: implement SMTP connection test
});


//* Login routes (ελεύθερα)
import loginRouter from './routes/login.js';
server.use(loginRouter);



///////////////// ROUTES ΜΟΝΟ ΓΙΑ ΠΙΣΤΟΠΟΙΗΜΕΝΟΥΣ ΧΡΗΣΤΕΣ /////////////////

server.use(validateUser);

// Dashboard routes
import dashboard from './routes/dashboard.js';
server.use(dashboard);

// Admin routes
import admin from './routes/admin.js';
server.use('/admin', admin);

// Own account routes
import account from './routes/account.js';
server.use('/account', account);

// Canteens routes
import canteens from './routes/canteens.js';
server.use('/canteens', canteens);

// Properties routes
import properties from './routes/properties.js';
server.use('/properties', properties);





// Catch-all route for 404 errors (must be last)
server.use((req, res) => {
    res.status(404).render('errors/404');
});


///////////////////////////////////         THE SERVER         /////////////////////////////////////

async function startServer(){
    await databaseConnectionTest(db);
    if (process.env.SYNCMODELS==='true') {await Models.syncModels()};
    let port = process.env.PORT??80;
    let listeningURL = process.env.LISTENINGURL??'http://localhost';
    server.listen(port, () => {
        log.system(`Express server is listening at ${listeningURL}. Started at ${presentTime()}.`);
    });
}
startServer();

