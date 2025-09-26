import { Router } from 'express';
import Models from '../models/models.js';
import { can } from '../controllers/roles.js';
import log from '../controllers/logger.js';
import { Op } from 'sequelize';

/**
 * Routes for managing canteens of the logged-in principal.
 * @type {Router}
 */
const myCanteen = Router();









/**
 * Helper function για υπολογισμό των πεδίων rent_offer, rent και tax_stamp
 * @param {Object} canteen - Το canteen object με τα leases
 * @param {number} students - Αριθμός μαθητών
 * @param {number} workingDays - Ημέρες λειτουργίας
 * @returns {Object} Αντικείμενο με τα υπολογιζόμενα πεδία
 */
function calculateRentFields(canteen, students, workingDays) {
    // Πάρε το rent από το πιο πρόσφατο lease
    const latestLease = canteen.leases?.[0];
    const rentOffer = latestLease?.rent || 0;
    
    // Υπολογισμός rent: (1/189) * rent_offer * students * working_days
    const rent = (1/189) * rentOffer * students * workingDays;
    
    // Υπολογισμός tax_stamp: rent * 0.036
    const taxStamp = rent * 0.036;
    
    return {
        rent_offer: rentOffer,
        rent: parseFloat(rent.toFixed(2)),
        tax_stamp: parseFloat(taxStamp.toFixed(2))
    };
}









/**
 * GET / - Εμφάνιση όλων των κυλικείων του συνδεδεμένου principal
 */
myCanteen.get('/', can('edit:ownschool'), async (req, res) => {
    try {

        //# 1. Βρίσκουμε τα κυλικεία του Διευθυντή

        // Βρες τον principal με βάση το email του συνδεδεμένου χρήστη
        const principal = await Models.Principal.findOne({
            where: { email: req.user.email },
            include: [{
                model: Models.Canteen,
                as: 'canteens',
                where: { active: true },
                required: false // LEFT JOIN για να εμφανίζει το principal ακόμα και χωρίς κυλικεία
            }],
            order: [[{ model: Models.Canteen, as: 'canteens' }, 'name', 'ASC']]
        });

        if (!principal) {
            log.warn(`Principal με email ${req.user.email} δεν βρέθηκε`);
            return res.status(404).render('errors/404', { 
                message: 'Δεν βρέθηκαν στοιχεία διευθυντή' 
            });
        }

        //# 2. Ελέγχουμε τις εκκρεμότητές του Διευθυντή (αν δεν έχει υποβάλει στοιχεία για ανοιχτές περιόδους)
        
        // Φέρε τις 2 τελευταίες periods που είναι open ή closed (δεν γίνεται φίλτρο σε virtual field)
        const latestPeriods = await Models.Period.findAll({
            order: [['end_date', 'DESC']],
            limit: 3 // Φέρνουμε τα 3 πιο πρόσφατα (δεν μας νοιάζουν τα παλιότερα)
        });
        const periods = latestPeriods.filter(p => ['open', 'closed'].includes(p.status));

        // Για κάθε κυλικείο, έλεγξε αν έχει υποβάλει στοιχεία για τις relevant periods
        const canteens = principal.canteens || [];
        const periodIds = periods.map(p => p.id);

        // Επιστρέφει για κάθε κυλικείο τις υποβολές που αφορούν τις recent periods
        let canteensWithStatus;
        if (periodIds.length === 0) {
            // Δεν υπάρχουν relevant periods — επιστρέφουμε τα κυλικεία χωρίς pending
            canteensWithStatus = canteens.map(c => ({
                ...c.toJSON(),
                submissions: [],
                missingPeriods: [],
                hasPending: false
            }));
        } else {
            canteensWithStatus = await Promise.all(canteens.map(async (canteen) => {
                // Βρες submissions του συγκεκριμένου κυλικείου για τις relevant periods
                const submissions = await Models.Submission.findAll({
                    where: {
                        period_id: { [Op.in]: periodIds },
                        property_id: canteen.id,
                        property_type: 'canteen',
                        // principal_id: principal.id           // Ας βλέπει και τις υποβολές άλλων principals
                    },
                    attributes: ['id', 'period_id', 'property_id', 'property_type']
                });

                const submittedPeriodIds = new Set(submissions.map(s => s.period_id));
                const missingPeriods = periods
                    .filter(p => !submittedPeriodIds.has(p.id))
                    .map(p => ({ id: p.id, code: p.code, status: p.status }));

                return {
                    ...canteen.toJSON(),
                    submissions,
                    missingPeriods,
                    hasPending: missingPeriods.length > 0
                };
            }));
        }

        //# 3. Συγκέντρωση στατιστικών εκκρεμοτήτων και render της σελίδας
        const pendingCanteens = canteensWithStatus.filter(c => c.hasPending);
        const pendingCount = pendingCanteens.length;
        const pendingDetails = pendingCanteens.map(c => ({
            id: c.id,
            name: c.name,
            missingCount: c.missingPeriods.length,
            missingCodes: c.missingPeriods.map(p => p.code)
        }));

        res.render('principals/mycanteen', { 
            canteens: canteensWithStatus,
            periods,
            principal,
            pendingCount,
            pendingDetails,
            user: req.user,
            title: 'Το κυλικείο μου'
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση κυλικείων principal: ${error}`);
        res.status(500).render('errors/500', { 
            message: 'Σφάλμα κατά την ανάκτηση των κυλικείων σας' 
        });
    }
});




/**
 * GET /:canteenId/periods - Εμφάνιση περιόδων συγκεκριμένου κυλικείου του principal
 */
myCanteen.get('/:canteenId/periods', can('edit:ownschool'), async (req, res) => {
    try {
        const canteenId = parseInt(req.params.canteenId);

        // Βρες τον principal με βάση το email του συνδεδεμένου χρήστη
        const principal = await Models.Principal.findOne({
            where: { email: req.user.email }
        });

        if (!principal) {
            log.warn(`Principal με email ${req.user.email} δεν βρέθηκε`);
            return res.status(404).render('errors/404', { 
                message: 'Δεν βρέθηκαν στοιχεία διευθυντή' 
            });
        }

        // Βρες το κυλικείο και έλεγξε ότι ανήκει στον principal
        const canteen = await Models.Canteen.findOne({
            where: { 
                id: canteenId,
                principal_id: principal.id,
                active: true
            },
            include: [{
                model: Models.Principal,
                as: 'principal'
            }]
        });

        if (!canteen) {
            log.warn(`Canteen ${canteenId} δεν βρέθηκε ή δεν ανήκει στον principal ${principal.id}`);
            return res.status(403).render('errors/403', { 
                message: 'Δεν έχετε δικαίωμα πρόσβασης σε αυτό το κυλικείο' 
            });
        }

        // Βρες όλες τις ενεργές περιόδους κυλικείων (όχι inactive)
        const periods = await Models.Period.findAll({
            where: { 
                property_type: 'canteen',
                active: true
            },
            include: [{
                model: Models.Submission,
                as: 'submissions',
                where: { 
                    property_id: canteenId,
                    property_type: 'canteen'
                },
                required: false // LEFT JOIN για να δούμε και τις περιόδους χωρίς submissions
            }],
            order: [['start_date', 'DESC']]
        });

        // Φιλτράρω τις περιόδους που δεν έχουν status 'inactive'
        const activePeriods = periods.filter(period => period.status !== 'inactive');

        // Προσθέτω πληροφορία για το αν έχει υποβληθεί submission
        const periodsWithSubmissionStatus = activePeriods.map(period => {
            const hasSubmission = period.submissions && period.submissions.length > 0;
            return {
                ...period.toJSON(),
                hasSubmission,
                submissionStatus: hasSubmission ? 'Έχουν υποβληθεί στοιχεία' : 'Εκκρεμεί υποβολή στοιχείων'
            };
        });

        res.render('principals/periods', { 
            periods: periodsWithSubmissionStatus,
            canteen,
            principal,
            user: req.user,
            title: `Περίοδοι - ${canteen.name}`
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση περιόδων κυλικείου: ${error}`);
        res.status(500).render('errors/500', { 
            message: 'Σφάλμα κατά την ανάκτηση των περιόδων' 
        });
    }
});












/**
 * GET /:canteenId/periods/:periodId/submission - Εμφάνιση φόρμας υποβολής στοιχείων για συγκεκριμένη περίοδο
 */
myCanteen.get('/:canteenId/periods/:periodId/submission', can('edit:ownschool'), async (req, res) => {
    try {
        const canteenId = parseInt(req.params.canteenId);
        const periodId = parseInt(req.params.periodId);

        // Βρες τον principal με βάση το email του συνδεδεμένου χρήστη
        const principal = await Models.Principal.findOne({
            where: { email: req.user.email }
        });

        if (!principal) {
            log.warn(`Principal με email ${req.user.email} δεν βρέθηκε`);
            return res.status(404).render('errors/404', { 
                message: 'Δεν βρέθηκαν στοιχεία διευθυντή' 
            });
        }

        // Βρες το κυλικείο και έλεγξε ότι ανήκει στον principal
        const canteen = await Models.Canteen.findOne({
            where: { 
                id: canteenId,
                principal_id: principal.id,
                active: true
            },
            include: [{
                model: Models.Lease,
                as: 'leases',
                where: {
                    property_type: 'canteen'
                },
                required: false,
                order: [['lease_end', 'DESC']],
                limit: 1
            }]
        });

        if (!canteen) {
            log.warn(`Canteen ${canteenId} δεν βρέθηκε ή δεν ανήκει στον principal ${principal.id}`);
            return res.status(403).render('errors/403', { 
                message: 'Δεν έχετε δικαίωμα πρόσβασης σε αυτό το κυλικείο' 
            });
        }

        // Βρες την περίοδο
        const period = await Models.Period.findOne({
            where: { 
                id: periodId,
                property_type: 'canteen',
                active: true
            }
        });

        if (!period) {
            log.warn(`Period ${periodId} δεν βρέθηκε`);
            return res.status(404).render('errors/404', { 
                message: 'Η περίοδος δεν βρέθηκε' 
            });
        }


        // Βρες υπάρχον submission αν υπάρχει
        const existingSubmission = await Models.Submission.findOne({
            where: {
                period_id: periodId,
                property_id: canteenId,
                property_type: 'canteen',
                principal_id: principal.id
            },
            include: [{
                model: Models.Principal,
                as: 'submittedByPrincipal',
                required: false
            }]
        });

        // Πάρε το rent από το πιο πρόσφατο lease
        const latestLease = canteen.leases?.[0];
        const rentOffer = latestLease?.rent || 0;

        res.render('principals/submission', {
            canteen,
            period,
            submission: existingSubmission,
            rentOffer,
            principal,
            user: req.user,
            title: `Υποβολή στοιχείων - ${canteen.name} - ${period.name}`
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την εμφάνιση φόρμας υποβολής: ${error}`);
        res.status(500).render('errors/500', { 
            message: 'Σφάλμα κατά την εμφάνιση της φόρμας υποβολής' 
        });
    }
});

/**
 * POST /:canteenId/periods/:periodId/submission - Δημιουργία νέου submission
 */
myCanteen.post('/:canteenId/periods/:periodId/submission', can('edit:ownschool'), async (req, res) => {
    try {
        const canteenId = parseInt(req.params.canteenId);
        const periodId = parseInt(req.params.periodId);
        const { students, working_days, electricity_cost } = req.body;
        const principalId = req.user.sub;

        // Βρες το κυλικείο και έλεγξε ότι ανήκει στον principal
        const canteen = await Models.Canteen.findOne({
            where: {
                id: canteenId,
                principal_id: principalId,
                active: true
            },
            include: [{
                model: Models.Lease,
                as: 'leases',
                where: {
                    property_type: 'canteen'
                },
                required: false,
                order: [['lease_end', 'DESC']],
                limit: 1
            }]
        });

        if (!canteen) {
            log.warn(`Canteen ${canteenId} δεν βρέθηκε ή δεν ανήκει στον principal ${principalId}`);
            return res.status(403).json({
                success: false,
                message: 'Δεν έχετε δικαίωμα πρόσβασης σε αυτό το κυλικείο'
            });
        }

        // Βρες την περίοδο και έλεγξε ότι επιτρέπει υποβολές (open ή closed)
        const period = await Models.Period.findOne({
            where: {
                id: periodId,
                property_type: 'canteen',
                active: true
            }
        });

        if (!period) {
            log.warn(`Period ${periodId} δεν βρέθηκε`);
            return res.status(404).json({
                success: false,
                message: 'Η περίοδος δεν βρέθηκε'
            });
        }

        if (!['open', 'closed'].includes(period.status)) {
            log.warn(`Δεν επιτρέπεται υποβολή για περίοδο με status: ${period.status}`);
            return res.status(400).json({
                success: false,
                message: 'Δεν επιτρέπεται υποβολή στοιχείων για αυτή την περίοδο'
            });
        }

        // Έλεγχος αν υπάρχει ήδη submission
        const existingSubmission = await Models.Submission.findOne({
            where: {
                period_id: periodId,
                property_id: canteenId,
                property_type: 'canteen',
                principal_id: principalId
            }
        });

        if (existingSubmission) {
            log.warn(`Υπάρχει ήδη submission για period ${periodId}, canteen ${canteenId}, principal ${principalId}`);
            return res.status(400).json({
                success: false,
                message: 'Υπάρχει ήδη υποβολή στοιχείων για αυτή την περίοδο'
            });
        }

        // Βασικός έλεγχος δεδομένων
        if (!students || !working_days || electricity_cost === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Παρακαλώ συμπληρώστε όλα τα απαιτούμενα πεδία'
            });
        }

        // Υπολογισμός των πεδίων rent_offer, rent και tax_stamp
        const calculatedFields = calculateRentFields(canteen, parseInt(students), parseInt(working_days));

        // Δημιουργία νέου submission
        const newSubmission = await Models.Submission.create({
            period_id: periodId,
            property_id: canteenId,
            property_type: 'canteen',
            principal_id: principalId,
            submittedBy: principalId,
            students: parseInt(students),
            working_days: parseInt(working_days),
            electricity_cost: parseFloat(electricity_cost),
            rent_offer: calculatedFields.rent_offer,
            rent: calculatedFields.rent,
            tax_stamp: calculatedFields.tax_stamp
        });

        log.info(`Νέο submission δημιουργήθηκε: Period ${periodId}, Canteen ${canteenId}, Principal ${principalId} (ID: ${newSubmission.id})`);

        res.status(201).json({
            success: true,
            message: 'Η υποβολή στοιχείων δημιουργήθηκε επιτυχώς',
            submission: newSubmission
        });
    } catch (error) {
        log.error(`Σφάλμα κατά τη δημιουργία submission: ${error}`);
        res.status(500).json({
            success: false,
            message: 'Σφάλμα κατά τη δημιουργία της υποβολής στοιχείων'
        });
    }
});

/**
 * PUT /:canteenId/periods/:periodId/submission - Ενημέρωση υπάρχοντος submission (μόνο αν period.status = 'open')
 */
myCanteen.put('/:canteenId/periods/:periodId/submission', can('edit:ownschool'), async (req, res) => {
    try {
        const canteenId = parseInt(req.params.canteenId);
        const periodId = parseInt(req.params.periodId);
        const { students, working_days, electricity_cost } = req.body;
        const principalId = req.user.sub;

        // Βρες το κυλικείο και έλεγξε ότι ανήκει στον principal
        const canteen = await Models.Canteen.findOne({
            where: {
                id: canteenId,
                principal_id: principalId,
                active: true
            },
            include: [{
                model: Models.Lease,
                as: 'leases',
                where: {
                    property_type: 'canteen'
                },
                required: false,
                order: [['lease_end', 'DESC']],
                limit: 1
            }]
        });

        if (!canteen) {
            log.warn(`Canteen ${canteenId} δεν βρέθηκε ή δεν ανήκει στον principal ${principalId}`);
            return res.status(403).json({
                success: false,
                message: 'Δεν έχετε δικαίωμα πρόσβασης σε αυτό το κυλικείο'
            });
        }

        // Βρες την περίοδο και έλεγξε ότι είναι ανοιχτή για επεξεργασία
        const period = await Models.Period.findOne({
            where: {
                id: periodId,
                property_type: 'canteen',
                active: true
            }
        });

        if (!period) {
            log.warn(`Period ${periodId} δεν βρέθηκε`);
            return res.status(404).json({
                success: false,
                message: 'Η περίοδος δεν βρέθηκε'
            });
        }

        if (period.status !== 'open') {
            log.warn(`Δεν επιτρέπεται επεξεργασία για περίοδο με status: ${period.status}`);
            return res.status(400).json({
                success: false,
                message: 'Δεν επιτρέπεται επεξεργασία στοιχείων για αυτή την περίοδο'
            });
        }

        // Βρες το υπάρχον submission
        const submission = await Models.Submission.findOne({
            where: {
                period_id: periodId,
                property_id: canteenId,
                property_type: 'canteen',
                principal_id: principalId
            }
        });

        if (!submission) {
            log.warn(`Submission δεν βρέθηκε για period ${periodId}, canteen ${canteenId}, principal ${principalId}`);
            return res.status(404).json({
                success: false,
                message: 'Δεν βρέθηκε υποβολή στοιχείων για επεξεργασία'
            });
        }

        // Βασικός έλεγχος δεδομένων
        if (!students || !working_days || electricity_cost === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Παρακαλώ συμπληρώστε όλα τα απαιτούμενα πεδία'
            });
        }

        // Υπολογισμός των πεδίων rent_offer, rent και tax_stamp
        const calculatedFields = calculateRentFields(canteen, parseInt(students), parseInt(working_days));

        // Ενημέρωση του submission
        const updateData = {
            students: parseInt(students),
            working_days: parseInt(working_days),
            electricity_cost: parseFloat(electricity_cost),
            rent_offer: calculatedFields.rent_offer,
            rent: calculatedFields.rent,
            tax_stamp: calculatedFields.tax_stamp,
            submittedBy: principalId
        };

        await submission.update(updateData);

        log.info(`Το Submission ενημερώθηκε: Period ${periodId}, Canteen ${canteenId}, Principal ${principalId} (ID: ${submission.id})`);

        res.json({
            success: true,
            message: 'Η υποβολή στοιχείων ενημερώθηκε επιτυχώς',
            submission: submission
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ενημέρωση submission: ${error}`);
        res.status(500).json({
            success: false,
            message: 'Σφάλμα κατά την ενημέρωση της υποβολής στοιχείων'
        });
    }
});









export default myCanteen;