import { User } from "./user.js";
import { db, databaseConnectionTest } from '../config/database.js';
import log from '../controllers/logger.js';


////////////////    MODELS ASSOCIATIONS    ////////////////



////////////////    MODELS SYNC    ////////////////

/**
 * Συγχρονίζει όλα τα models με τη βάση κατά την εκκίνηση
 */
async function syncModels() {
    if (process.env.SYNCMODELS==='true') {
        try {
            await db.sync({ alter: true });
            log.success('Όλα τα models συγχρονίστηκαν επιτυχώς με τη βάση.');
        } catch (err) {
            log.error('[Sequelize] Σφάλμα συγχρονισμού models:', err);
        }
    } 
}






export default {
    User,
    syncModels
};