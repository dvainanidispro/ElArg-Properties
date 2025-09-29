
import Models from '../models/models.js';
import log from './logger.js';
import { createAccessToken } from './auth.js';


const appName = process.env.APPNAME || "Εφαρμογή Ακινήτων Δήμου Ελληνικού - Αργυρούπολης";


/**
 * Δημιουργεί και επιστρέφει το Magic Link για τον χρήστη
 * @param {string} email - Το email του χρήστη
 * @returns {Promise<string|false>} Το HTML link ή false αν δεν βρέθηκε χρήστης
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
        return false;
    }
    log.info(`Magic Link requested for email: ${email}`);
    let token = createAccessToken(user, true);
    user.link = `${process.env.LISTENINGURL}/login?token=${token}`;
    // Εδώ θα έστελνα το email με το Magic Link, αλλά για την ώρα απλά το επιστρέφω
    return emailBodyTemplate("magicLink", user);
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
        case "reminder":
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

















export { createAndSendMagicLink };
