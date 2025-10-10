/**
 * Αποστολή Reminders στους Διευθυντές Σχολείων 
 * οι οποίοι δεν έχουν υποβάλει ακόμα στοιχεία για την ενεργή περίοδο.
 */

import Models from '../../models/models.js';
import { transporter } from '../email.js';
import log from '../logger.js';
import { getActiveCanteenPeriod } from './periods.js';
import { greekdate } from '../utils.js';

const appName = process.env.APPNAME || "Εφαρμογή Ακινήτων Δήμου Ελληνικού - Αργυρούπολης";
const appUrl = process.env.LISTENINGURL || "http://localhost";
const emailUser = process.env.EMAILUSERNAME ?? process.env.EMAILUSER ?? "";


let reminderBodyTemplate = (canteen, period) => {
    return `
        <p>Αγαπητέ/ή Διευθυντή/Διευθύντρια του σχολείου ${canteen.name},</p>
        <br>
        <p>Σας υπενθυμίζουμε ότι εκκρεμεί η υποβολή στοιχείων για το Κυλικείο της ευθύνης σας.</p>
        <p>Παρακαλούμε, όπως υποβάλετε τα απαραίτητα στοιχεία το συντομότερο δυνατό.</p>
        <p>Η προθεσμία υποβολής λήγει στις ${greekdate(period.submission_deadline)}.</p>
        <br>
        <p>Μπορείτε να συνδεθείτε στην Εφαρμογή Ακινήτων <a href="${appUrl}">εδώ</a> χρησιμοποιώντας την διεύθυνση email σας (${canteen.principal.email}).</p>
        <p></p>
        <p>Ευχαριστούμε για τη συνεργασία σας.</p>
        <br>
        <p>Με εκτίμηση,</p>
        <p>Δήμος Ελληνικού Αργυρούπολης</p>
        <p>Δ/νση Ανάπτυξης & Προγραμματισμού </p>
        <p>Τμήμα Αξιοποίησης Δημοτικής Περιουσίας</p>
    `;
};


/**
 * Αποστέλλει υπενθυμίσεις μέσω email στους διευθυντές σχολικών κυλικείων που δεν έχουν υποβάλει στοιχεία για την ενεργή περίοδο.
 *
 * @async
 * @function
 * @returns {Promise<void>} Δεν επιστρέφει τιμή. Καταγράφει αποτελέσματα μέσω log και βάσης δεδομένων.
 */
async function sendRemindersForPendingSubmissions () {
    try {

        //# 1 Βρίσκουμε την ενεργή περίοδο
        const period = await getActiveCanteenPeriod();
        if (!period) {
            log.info("Δεν βρέθηκε ενεργή περίοδος. Δεν στάλθηκαν υπενθυμίσεις.");
            return;
        }
        log.info(`Αποστολή υπενθυμίσεων για την ενεργή περίοδο: ${period.code}`);

        //# 2 Βρίσκουμε όλα τα σχολεία για τα οποία δεν έχουν υποβληθεί στοιχεία
        const activeCanteens = await Models.Canteen.findAll({
            attributes: ['id', 'name', 'active'],
            where: { active: true },
            include: [
                {
                    model: Models.Submission,
                    as: 'submissions',
                    attributes: ['id', 'period_id', 'property_type'],
                    where: { 
                        period_id: period.id,
                        property_type: 'canteen'
                    },
                    required: false
                },
                {
                    model: Models.Principal,
                    as: 'principal',
                    attributes: ['id', 'name', 'email'],
                    where: { active: true },
                    required: false
                },
            ],
            raw: true, // Με αυτό, τα submissions έρχονται σαν ένα αντικείμενο, όχι array
            nest: true
        });
        
        // log.info(canteens);
        const canteensWithoutSubmission = activeCanteens.filter(c => !c.submissions || !c.submissions.id);
        if (canteensWithoutSubmission.length === 0) {
            log.info("Όλα τα κυλικεία έχουν υποβάλει στοιχεία. Δεν στάλθηκαν υπενθυμίσεις.");
            return;
        }
        log.info(`Βρέθηκαν ${canteensWithoutSubmission.length} κυλικεία χωρίς υποβολή στοιχείων. Αποστολή υπενθυμίσεων τώρα...`);

        //# 3 Μετατροπή σε απλό array με τα απαραίτητα πεδία
        const pendingCanteens = canteensWithoutSubmission.map(c => ({
            id: c.id,
            name: c.name,
            principal: {
                id: c.principal.id,
                name: c.principal.name,
                email: c.principal.email
            }
        }));

        //# 4 Αρχική καταγραφή στη Βάση Δεδομένων (log)
        // log.info(pendingCanteens);
        let logEntryBefore = await Models.Log.create({
            type: "reminder",
            severity: "info",
            body: {
                period: {
                    id: period.id,
                    code: period.code
                },
                status: "to be sent",
                canteens: pendingCanteens
            },
        });

        //# 5 Αποστολή email στους Διευθυντές των σχολείων που δεν έχουν υποβάλει στοιχεία
        // Παράλληλη αποστολή όλων των emails

        const emailPromises = pendingCanteens.map(async (canteen) => {
            const principal = canteen.principal;
            if (!principal || !principal.email) {
                log.warn(`Το κυλικείο με ${canteen.id} - ${canteen.name} δεν έχει διευθυντή με email. Παράλειψη αποστολής υπενθύμισης.`);
                return { canteen, success: true, skipped: true };
            }

            // Αποστολή email reminder
            const emailSent = await sendEmailForPendingCanteen(canteen, period);
            if (emailSent) {
                log.info(`Στάλθηκε email στον ${principal.email} για το κυλικείο: ${canteen.name} (ID: ${canteen.id})`);
                return { canteen, success: true, skipped: false };
            } else {
                log.error(`Αποτυχία αποστολής email στον ${principal.email} για το κυλικείο: ${canteen.name} (ID: ${canteen.id})`);
                return { canteen, success: false, skipped: false };
            }
        });

        // Περιμένουμε όλα τα emails να ολοκληρωθούν
        const emailResults = await Promise.all(emailPromises);

        //# 6 Καταγραφή αποτελεσμάτων στη Βάση Δεδομένων (log)
        // log.info(emailResults);
        const canteensWithResults = emailResults.map(result => ({
            ...result.canteen,
            success: result.success,
            skipped: result.skipped
        }));

        let logEntryAfter = await Models.Log.create({
            type: "reminder",
            severity: "info",
            body: {
                period: {
                    id: period.id,
                    code: period.code
                },
                status: "sent",
                results: {
                    all: emailResults.length,
                    sent: emailResults.filter(r => r.success && !r.skipped).length,
                    failed: emailResults.filter(r => !r.success && !r.skipped).length,
                    skipped: emailResults.filter(r => r.skipped).length
                },
                canteens: canteensWithResults,
            },
        });

        const sentCountSuccesfully = emailResults.filter(r => r.success && !r.skipped).length;
        log.info(`Στάλθηκαν υπενθυμίσεις σε ${sentCountSuccesfully} διευθυντές.`);
    } catch (error) {
        log.error(`Σφάλμα στη sendRemindersToPrincipal: ${error}`);
    }
}

/**
 * Αποστέλλει email υπενθύμισης στον διευθυντή του σχολικού κυλικείου.
 * @param {Object} canteen - Το αντικείμενο του κυλικείου
 * @param {Object} period - Η ενεργή περίοδος
 * @returns {Promise<Boolean>} Επιστρέφει true αν αποσταλεί επιτυχώς το email ή δεν υπάρχει email, 
 * ή false αν προκύψει σφάλμα
 */
function sendEmailForPendingCanteen (canteen, period) {
    return new Promise((resolve) => {
        let mailOptions = {
            from: `"${appName}" <${emailUser}>`,
            to: canteen.principal.email,
            subject: `Υπενθύμιση υποβολής στοιχείων για το Σχολικό Κυλικείο`,
            html: reminderBodyTemplate(canteen, period),
        };
        log.dev(mailOptions);
        try {
            if (process.env.SENDACTUALEMAILS == 'false') {      // Μόνο αν έχει τεθεί false
                log.warn(`ΠΡΟΣΟΧΗ: Η αποστολή email είναι απενεργοποιημένη (SENDACTUALEMAILS=false).`);
                // Προσομοίωση αποστολής email με καθυστέρηση
                setTimeout(() => {
                    resolve(true);
                }, Math.random() * 10000); // 10000ms delay max
            } else {
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        log.error(`Σφάλμα αποστολής email: ${error.message}`);
                        resolve(false);
                    } else {
                        log.info(`Email στάλθηκε: ${info.response}`);
                        resolve(true);
                    }
                });
            }
        } catch (error) {
            log.error(`Σφάλμα στην εκτέλεση της sendEmailForPendingCanteen: ${error.message}`);
            resolve(false);
        }
    });
}



export { sendRemindersForPendingSubmissions };
