import { Router } from 'express';
import Models from '../models/models.js';
import { can } from '../controllers/roles.js';
import log from '../controllers/logger.js';

/**
 * Routes for managing canteens of the logged-in principal.
 * @type {Router}
 */
const myCanteen = Router();









/**
 * GET / - Εμφάνιση όλων των κυλικείων του συνδεδεμένου principal
 */
myCanteen.get('/', can('edit:ownschool'), async (req, res) => {
    try {
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

        res.render('principals/mycanteen', { 
            canteens: principal.canteens || [],
            principal,
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
            }
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

        // Βρες τον principal με βάση το email του συνδεδεμένου χρήστη
        const principal = await Models.Principal.findOne({
            where: { email: req.user.email }
        });

        if (!principal) {
            log.warn(`Principal με email ${req.user.email} δεν βρέθηκε`);
            return res.status(404).json({ 
                success: false, 
                message: 'Δεν βρέθηκαν στοιχεία διευθυντή' 
            });
        }

        // Βρες το κυλικείο και έλεγξε ότι ανήκει στον principal
        const canteen = await Models.Canteen.findOne({
            where: { 
                id: canteenId,
                principal_id: principal.id,
                active: true
            }
        });

        if (!canteen) {
            log.warn(`Canteen ${canteenId} δεν βρέθηκε ή δεν ανήκει στον principal ${principal.id}`);
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
                principal_id: principal.id
            }
        });

        if (existingSubmission) {
            log.warn(`Υπάρχει ήδη submission για period ${periodId}, canteen ${canteenId}, principal ${principal.id}`);
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

        // Δημιουργία νέου submission
        const newSubmission = await Models.Submission.create({
            period_id: periodId,
            property_id: canteenId,
            property_type: 'canteen',
            principal_id: principal.id,
            students: parseInt(students),
            working_days: parseInt(working_days),
            electricity_cost: parseFloat(electricity_cost)
        });

        log.info(`Νέο submission δημιουργήθηκε: Period ${periodId}, Canteen ${canteenId}, Principal ${principal.id} (ID: ${newSubmission.id})`);

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

        // Βρες τον principal με βάση το email του συνδεδεμένου χρήστη
        const principal = await Models.Principal.findOne({
            where: { email: req.user.email }
        });

        if (!principal) {
            log.warn(`Principal με email ${req.user.email} δεν βρέθηκε`);
            return res.status(404).json({ 
                success: false, 
                message: 'Δεν βρέθηκαν στοιχεία διευθυντή' 
            });
        }

        // Βρες το κυλικείο και έλεγξε ότι ανήκει στον principal
        const canteen = await Models.Canteen.findOne({
            where: { 
                id: canteenId,
                principal_id: principal.id,
                active: true
            }
        });

        if (!canteen) {
            log.warn(`Canteen ${canteenId} δεν βρέθηκε ή δεν ανήκει στον principal ${principal.id}`);
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
                principal_id: principal.id
            }
        });

        if (!submission) {
            log.warn(`Submission δεν βρέθηκε για period ${periodId}, canteen ${canteenId}, principal ${principal.id}`);
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

        // Ενημέρωση του submission
        const updateData = {
            students: parseInt(students),
            working_days: parseInt(working_days),
            electricity_cost: parseFloat(electricity_cost)
        };

        await submission.update(updateData);

        log.info(`Το Submission ενημερώθηκε: Period ${periodId}, Canteen ${canteenId}, Principal ${principal.id} (ID: ${submission.id})`);

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