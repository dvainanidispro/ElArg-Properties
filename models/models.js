import { User } from "./user.js";
import { Canteen } from "./canteens.js";
import { Principal } from "./principals.js";
import { db, databaseConnectionTest } from '../config/database.js';
import log from '../controllers/logger.js';


////////////////    MODELS ASSOCIATIONS    ////////////////

// One-to-many relationship: Principal -> Canteens
// Ένας principal μπορεί να έχει πολλά canteens, ένα canteen έχει το πολύ έναν principal.
// Η σχέση αποτυπώνεται στον πίνακα canteens με το πεδίο principal_id. 
Canteen.belongsTo(Principal, {
    foreignKey: 'principal_id',
    as: 'principal'
});
Principal.hasMany(Canteen, {
    foreignKey: 'principal_id',
    as: 'canteens'
});

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
    Canteen,
    Principal,
    syncModels
};