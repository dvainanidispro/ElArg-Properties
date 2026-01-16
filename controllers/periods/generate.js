/**
 * Αυτό το script δημιουργεί μια νέα περίοδο στη βάση δεδομένων αν δεν υπάρχει ήδη.
 * Αν η περίοδος υπάρχει, δεν γίνεται καμία ενέργεια.
 * Χρησιμοποιεί τις βοηθητικές συναρτήσεις από το functions.js και τη σημερινή ημερομηνία.
 */

import Models from '../../models/models.js';
const { Period } = Models;
import log from '../logger.js';
import { createPeriodEndingInMonthOf } from './functions.js';




/**
 * Δημιουργεί μια νέα περίοδο στη βάση δεδομένων αν δεν υπάρχει ήδη
 * @param {string|Date} date - Η ημερομηνία για την οποία θα δημιουργηθεί η περίοδος (προαιρετική, default: σημερινή ημερομηνία)
 * @returns {Promise<Object|null>} Η νέα περίοδος που δημιουργήθηκε ή null αν δεν χρειαζόταν δημιουργία
 */
async function generatePeriod(date = new Date()) {

    // date = '2026-02-11'; // συγκεκριμένη ημερομηνία για δοκιμές
    log.dev(date);

    log.info("Ξεκινά η διαδικασία δημιουργίας περιόδου.");

    try {
        // Βρίσκουμε ποια περίοδος λήγει στον μήνα της δοσμένης ημερομηνίας
        const periodData = createPeriodEndingInMonthOf(date);
        log.dev(periodData);
        
        if (!periodData) {
            log.info(`Δεν υπάρχει περίοδος προς δημιουργία για αυτό το μήνα.`);
            return null;
        }

        // Ελέγχουμε αν η περίοδος υπάρχει ήδη στη βάση
        const existingPeriod = await Period.findOne({
            where: {
                code: periodData.code
            }
        });

        if (existingPeriod) {
            log.info(`Η περίοδος ${periodData.code} υπάρχει ήδη στη βάση δεδομένων.`);
            return null;
        }

        // Δημιουργούμε τη νέα περίοδο
        const newPeriod = await Period.create(periodData);
        log.success(`Δημιουργήθηκε νέα περίοδος: ${newPeriod.code} (${newPeriod.start_date} - ${newPeriod.end_date})`);
        
        return newPeriod;

    } catch (error) {
        log.error(`Σφάλμα κατά τη δημιουργία περιόδου: ${error.message}`);
        throw error;
    } finally {
        // log.success("Ολοκληρώθηκε η διαδικασία δημιουργίας περιόδου.");
    }
}


/**
 * Επιστρέφει χωρίς να δημιουργεί, την επόμενη περίοδο που λήγει στον μήνα της δοσμένης ημερομηνίας
 * @param {string|Date} date
 * @returns {Object|null} Η επόμενη περίοδος
 */
function justShowNextPeriod(date = new Date()) {
    return createPeriodEndingInMonthOf(date);
}



export { generatePeriod, justShowNextPeriod };
