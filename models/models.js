import { User } from "./user.js";
import { Canteen } from "./canteen.js";
import { Principal } from "./principal.js";
import { Property } from "./property.js";
import { Lease } from "./lease.js";
import { Party } from "./party.js";
import { Period } from "./period.js";
import { Submission } from "./submission.js";
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


////// Lease associations

// Lease ανήκει σε Property
Lease.belongsTo(Property, {
    foreignKey: 'property_id',
    constraints: false, // επιτρέπει να δείχνει είτε σε property είτε σε canteen
    as: 'property'
});
Property.hasMany(Lease, {
    foreignKey: 'property_id',
    constraints: false,
    as: 'leases'
});

// Lease ανήκει σε Canteen (αν property_type === 'canteen')
Lease.belongsTo(Canteen, {
    foreignKey: 'property_id',
    constraints: false, // επιτρέπει να δείχνει είτε σε property είτε σε canteen
    as: 'canteen'
});
Canteen.hasMany(Lease, {
    foreignKey: 'property_id',
    constraints: false,
    as: 'leases'
});

// Lease ανήκει σε Party
Lease.belongsTo(Party, {
    foreignKey: 'party_id',
    as: 'party'
});
Party.hasMany(Lease, {
    foreignKey: 'party_id',
    as: 'leases',
    onDelete: 'RESTRICT' // Δεν επιτρέπει διαγραφή party αν υπάρχουν leases
});


////// Submission associations

// Submission ανήκει σε Period
Submission.belongsTo(Period, {
    foreignKey: 'period_id',
    as: 'period'
});
Period.hasMany(Submission, {
    foreignKey: 'period_id',
    as: 'submissions'
});

// Submission ανήκει σε Property (αν property_type === 'property')
Submission.belongsTo(Property, {
    foreignKey: 'property_id',
    constraints: false, // επιτρέπει να δείχνει είτε σε property είτε σε canteen
    as: 'property'
});
Property.hasMany(Submission, {
    foreignKey: 'property_id',
    constraints: false,
    as: 'submissions'
});

// Submission ανήκει σε Canteen (αν property_type === 'canteen')
Submission.belongsTo(Canteen, {
    foreignKey: 'property_id',
    constraints: false, // επιτρέπει να δείχνει είτε σε property είτε σε canteen
    as: 'canteen'
});
Canteen.hasMany(Submission, {
    foreignKey: 'property_id',
    constraints: false,
    as: 'submissions'
});

// Submission ανήκει σε Principal
Submission.belongsTo(Principal, {
    foreignKey: 'principal_id',
    as: 'principal'
});
Principal.hasMany(Submission, {
    foreignKey: 'principal_id',
    as: 'submissions'
});

// Submission υποβλήθηκε από Principal (submittedBy)
Submission.belongsTo(Principal, {
    foreignKey: 'submittedBy',
    as: 'submittedByPrincipal'
});
Principal.hasMany(Submission, {
    foreignKey: 'submittedBy',
    as: 'submittedSubmissions'
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
            log.error(`[Sequelize] Σφάλμα συγχρονισμού models: ${JSON.stringify(err)}`);
        }
    } 
}






export default {
    User,
    Canteen,
    Principal,
    Property,
    Party,
    Lease,
    Period,
    Submission,
    syncModels
};