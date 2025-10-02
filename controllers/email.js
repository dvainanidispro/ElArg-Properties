
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


/**
 * Δημιουργεί και επιστρέφει το Magic Link για τον χρήστη
 * @param {string} email - Το email του χρήστη
 * @returns {Promise<string|false>} Το HTML link ή false αν έγινε σφάλμα
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

    // Απλή εμφάνιση του email Body στη σελίδα προς το παρόν
    return emailBodyTemplate("magicLink", user);

    const mailOptions = {
        from: `"${appName}" <${process.env.EMAILUSER}>`,
        to: email,  // email == user.email  (είναι το ίδιο)
        subject: `${appName}`,
        html: emailBodyTemplate("magicLink", user)
    };
    try{
        const info = await transporter.sendMail(mailOptions);
        console.log("Message sent: %s", info.messageId);
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

















export { createAndSendMagicLink, transporter, emailBodyTemplate };
