import Models from '../models/models.js';
import nodemailer from 'nodemailer';
import log from './logger.js';
import { createAccessToken } from './auth.js';


const appName = process.env.APPNAME || "Εφαρμογή Ακινήτων Δήμου Ελληνικού - Αργυρούπολης";
const appUrl = process.env.LISTENINGURL || "http://localhost";

const emailConfig = {
    host: process.env.EMAILHOST,
    port: process.env.EMAILPORT,
    secureConnection: false, // true for 465, false for other ports
    tls: {
        ciphers:'SSLv3'
    },
    auth: {
        user: process.env.EMAILUSER,
        pass: process.env.EMAILPASS
    },
    pool: true,
    // maxConnections: 5,  // 5 = default
    // maxMessages: 100,    // 100 = default
    // rateLimit: 5,        // 5 messages per second = default, deprecated για μελλοντικές εκδόσεις nodemailer

};
const transporter = nodemailer.createTransport(emailConfig);

// Επιβεβαίωση σύνδεσης με τον SMTP server κατά την εκκίνηση
transporter.verify((error, success) => {
    if (error) {
        log.error(`SMTP transporter verification failed: ${error}`);
    } else {
        log.system(`SMTP connection to ${emailConfig.host} has been established successfully | Ready to send emails.`);
    }
});

/**
 * Ελέγχει τη σύνδεση με τον SMTP server με timeout 3 δευτερολέπτων
 * @returns {Promise<boolean>} true αν η σύνδεση είναι επιτυχής, false αλλιώς
 */
const checkSmtpConnection = async () => {
    try {
        await Promise.race([
            new Promise((resolve, reject) => {
                transporter.verify((error, success) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(success);
                    }
                });
            }),
            new Promise((_, reject) => {
                setTimeout(() => reject(new Error('SMTP connection timeout (3s)')), 3000);
            })
        ]);
        return true;
    } catch (error) {
        throw error;
    }
};





/**
 * Δημιουργεί και επιστρέφει το Magic Link για τον χρήστη
 * @param {string} email - Το email του χρήστη
 * @returns {Promise<string|false>} false αν έγινε σφάλμα, true είτε βρέθηκε ο χρήστης, είτε όχι
 */
const createAndSendMagicLink = async (email) => {
    const userModels = [Models.Principal, Models.User];
    let user = null;
    for (const Model of userModels) {
        user = await Model.findOne({
            where: { email: email, active: true },
            raw: true,
            nest: true
        });
        if (user) break;
    }
    if (!user) {
        log.warn(`Magic Link requested for non-existing email: ${email}`);
        return true;  // για να μην αποκαλύπτεται αν υπάρχει ο χρήστης ή όχι
    }
    log.info(`Magic Link requested for email: ${email}`);
    let token = createAccessToken(user, true);
    user.link = `${process.env.LISTENINGURL}/login?token=${token}`;

    if (process.env.SENDACTUALEMAILS === 'false'){
        return emailBodyTemplate("magicLink", user);
    }

    const mailOptions = {
        from: `"${appName}" <${process.env.EMAILUSER}>`,
        to: email,  // email == user.email  (είναι το ίδιο)
        subject: `${appName}`,
        html: emailBodyTemplate("magicLink", user)
    };
    try{
        // log.info({ host: emailConfig.host, port: emailConfig.port, secure: emailConfig.secureConnection, user: emailConfig.auth?.user, pass: emailConfig.auth?.pass ? 'yes' : 'no' });
        const info = await transporter.sendMail(mailOptions);
        // log.info("Message sent: %s", info.messageId);
        log.info(`Magic Link email sent to: ${email}`);
        return true;
    } catch (error) {
        log.error(`Error sending Magic Link email to: ${email}: ${error}`);
        return false;
    }
};



/**
 * Επιστρέφει το σώμα του email, ανάλογα το σκοπό του email
 * @param {string} purpose - Ο σκοπός του email (π.χ. "magicLink", "reminder")
 */
const emailBodyTemplate = (purpose, user) => {
    switch (purpose) {
        case "magicLink":
              return /*HTML*/`
              Για να συνδεθείτε στην εφαρμογή, κάντε κλικ στον παρακάτω σύνδεσμο:
              <br>
              <a href="${user.link}">Είσοδος στη Εφαρμογή</a>
              <br>
              <br>
              ${appName}
              `;
        case "reminderForPendingSubmission":
              return /*HTML*/`
              Αυτή είναι μια υπενθύμιση.
              <br>
              <br>
              ${appName}
              `;
        default:
            return false;
    }
};

















export { createAndSendMagicLink, transporter, emailBodyTemplate, checkSmtpConnection };
