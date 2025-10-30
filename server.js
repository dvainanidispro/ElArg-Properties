////////////////////  INITIALIZATION  ////////////////////


console.log('Initializing server...');

import express from 'express';
import handlebarsEngine from './config/handlebars.js';
import cookieParser from 'cookie-parser';
import log from './controllers/logger.js';
import Security from "./config/security.js";
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
server.use(Security);



////////////////////   MIDDLEWARE AND FUNCTIONS   ////////////////////

import { presentTime } from './controllers/utils.js';
import { validateUser } from './controllers/auth.js';

import { db, databaseConnectionTest } from './config/database.js';
import Models from './models/models.js';
import { checkSmtpConnection } from './controllers/email.js';



/////////////////        ΕΛΕΥΘΕΡΑ ROUTES      /////////////////


server.get(['/status', '/health'], async (req, res) => {
    let statusData = {
        webServer: 'OK',
        database: 'FAILED',
        smtp: 'NOT TESTED'
    };
    let overallStatus = 500;
    
    try {  
        // Έλεγχος σύνδεσης με τη βάση δεδομένων
        await db.authenticate();
        statusData.database = 'OK';
        overallStatus = 200;
        
        // Έλεγχος SMTP σύνδεσης μόνο αν η βάση είναι επιτυχής
        try {
            await checkSmtpConnection();
            statusData.smtp = 'OK';
        } catch (smtpError) {
            statusData.smtp = 'FAILED';
            log.error(`SMTP connection test failed: ${smtpError}`);
        }
    } catch (error) {
        statusData.database = 'FAILED';
        log.error(`Database connection test failed: ${error}`);
    }
    
    const htmlTable = `
    <table style="border-collapse: collapse;">
        <style>td { border: 1px solid black; padding: 5px; }</style>
        <tr><td>Web Server</td><td>${statusData.webServer}</td></tr>
        <tr><td>Database Connection</td><td>${statusData.database}</td></tr>
        <tr><td>SMTP Connection</td><td>${statusData.smtp}</td></tr>
    </table>`;
    
    res.status(overallStatus).send(htmlTable);
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
        log.system(`Express server started at ${presentTime()} | Listening at ${listeningURL}.`);
        log.info('Node.js version: ' + process.version);
    });
}
startServer();

