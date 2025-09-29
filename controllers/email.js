
import Models from '../models/models.js';
import log from './logger.js';
import { createAccessToken } from './auth.js';






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
    return `<a href="/login?token=${token}">${process.env.LISTENINGURL}/login?token=${token}</a>`;
};

export { createAndSendMagicLink };
