import { Router } from 'express';
import Models from '../models/models.js';
import { getSubperiods, calculateRentFields } from '../controllers/periods/periods.js';
import { can } from '../controllers/roles.js';
import log from '../controllers/logger.js';

/**
 * Routes for managing canteens of the logged-in principal.
 * 
 * Available routes:
 * - GET    /                                             - Εμφάνιση όλων των κυλικείων του συνδεδεμένου principal
 * - GET    /:canteenId/periods                           - Εμφάνιση περιόδων συγκεκριμένου κυλικείου
 * - GET    /:canteenId/periods/:periodId/submission      - Εμφάνιση φόρμας υποβολής στοιχείων
 * - POST   /:canteenId/periods/:periodId/submission      - Δημιουργία νέου submission
 * - PUT    /:canteenId/periods/:periodId/submission      - Ενημέρωση υπάρχοντος submission
 * 
 * @type {Router}
 */
const myCanteen = Router();

// Middleware για έλεγχο edit:ownschool δικαιωμάτων
myCanteen.use(can('edit:ownschool'));











/**
 * GET / - Εμφάνιση όλων των κυλικείων του συνδεδεμένου principal
 */
myCanteen.get('/', async (req, res) => {
    try {


        //# 1. Βρίσκουμε τα κυλικεία του Διευθυντή

        // Βρες τον principal με βάση το email του συνδεδεμένου χρήστη
        const principal = await Models.Principal.findOne({
            where: { email: req.user.email },
            include: [{
                model: Models.Canteen,
                as: 'canteens',
                where: { active: true },
                required: false // LEFT JOIN για να φέρνει τον principal ακόμα και χωρίς κυλικεία
            }],
            order: [[{ model: Models.Canteen, as: 'canteens' }, 'name', 'ASC']]
        });

        if (!principal) {
            log.warn(`Principal με email ${req.user.email} δεν βρέθηκε`);
            return res.status(404).render('errors/404', { 
                message: 'Δεν βρέθηκαν στοιχεία διευθυντή' 
            });
        }
        
        /** Τα κυλικεία που ανήκουν στον Διευθυντή */
        const canteens = principal.canteens || [];


        //# 2. Ελέγχουμε τα κυλικεία του Διευθυντή (και τις υποβολές τους) για τα relevant periods
        
        // Φέρε τις 3 τελευταίες periods που είναι open ή closed (δεν γίνεται φίλτρο σε virtual field)
        const latestPeriods = await Models.Period.findAll({
            order: [['end_date', 'DESC']],
            limit: 3 // Φέρνουμε τα 3 πιο πρόσφατα (δεν μας νοιάζουν τα παλιότερα)
        });
        const periods = latestPeriods.filter(p => ['open', 'closed'].includes(p.status));
        const periodIds = periods.map(p => p.id);

        /**
         * Το canteensWithStatus είναι το canteen array (παραπάνω) όπου το κάθε αντικείμενο του
         * θα ενισχυθεί με επιπλέον πεδία. Κάθε αντικείμενο του (ενισχυμένο canteen) θα έχει τη μορφή:
         * {
         *   id: <canteen_id>,
         *   name: <canteen_name>,
         *   principal_id: <principal_id>,
         *   active: <boolean>,
         *   άλλαΠεδίαΚυλικείου: ['κλπ'],
         *   submissions: [<submission_objects> με keys: id, period_id, property_id, property_type],
         *   missingPeriods: [<missing_period_objects> με keys: id, code, status],
         *   hasPending: <boolean>
         * }
         */
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
                        period_id: periodIds, // Ισοδύναμο με { [Op.in]: periodIds }
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
        const pendingCount = canteensWithStatus.reduce((count, canteen) => {
            return count + canteen.missingPeriods.length;
        }, 0);

        res.render('principals/mycanteen', { 
            canteens: canteensWithStatus,
            periods,
            principal,
            pendingCount,
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
myCanteen.get('/:canteenId/periods', async (req, res) => {
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
            log.warn(`Canteen ${canteenId} δεν βρέθηκε, δεν είναι ενεργό ή δεν ανήκει στον principal ${principal.id}`);
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

        // Φιλτράρω τις περιόδους που δεν έχουν status 'inactive' (το virtual field δεν μπορεί να φιλτραριστεί με το query)
        const activePeriods = periods.filter(period => period.status !== 'inactive');

        // Προσθέτω πληροφορία για το αν έχει υποβληθεί submission
        const periodsWithSubmissionStatus = activePeriods.map(period => {
            const hasSubmission = period.submissions && period.submissions.length > 0;
            return {
                ...period.toJSON(),
                hasSubmission,
                submission: hasSubmission ? period.submissions[0] : null,
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
myCanteen.get('/:canteenId/periods/:periodId/submission', async (req, res) => {
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
                    property_type: 'canteen',
                    active: true
                },
                required: false,
                order: [['lease_end', 'DESC']]
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

        // Δημιούργησε subperiods για όλα τα ενεργά leases
        const activeLeases = canteen.leases || [];
        const rentOffer = activeLeases[0]?.rent || 0;
        
        // Δημιουργία subperiods με βάση όλα τα leases και την περίοδο
        const subperiods = getSubperiods(period, canteen.leases);

        res.render('principals/submission', {
            canteen,
            period,
            submission: existingSubmission,
            rentOffer,
            subperiods,
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
myCanteen.post('/:canteenId/periods/:periodId/submission', async (req, res) => {
    try {
        const canteenId = parseInt(req.params.canteenId);
        const periodId = parseInt(req.params.periodId);
        const { data: subperiodsData } = req.body;
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
                    property_type: 'canteen',
                    active: true
                },
                required: false,
                order: [['lease_end', 'DESC']]
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
        if (!subperiodsData || !Array.isArray(subperiodsData) || subperiodsData.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Παρακαλώ συμπληρώστε όλα τα απαιτούμενα πεδία'
            });
        }

        // Έλεγχος ότι όλα τα subperiods έχουν τα απαιτούμενα πεδία και είναι αριθμοί
        for (const subperiod of subperiodsData) {
            const students = Number(subperiod.students);
            const workingDays = Number(subperiod.working_days);
            const electricityCost = Number(subperiod.electricity_cost);
            
            if (isNaN(students) || isNaN(workingDays) || isNaN(electricityCost)) {
                return res.status(400).json({
                    success: false,
                    message: 'Παρακαλώ συμπληρώστε όλα τα απαιτούμενα πεδία για όλες τις περιόδους'
                });
            }
        }

        // Πάρε τα subperiods με τα rent values και συγχώνευσε με τα δεδομένα από το frontend
        const subperiods = getSubperiods(period, canteen.leases);
        
        // Συγχώνευση subperiods με subperiodsData
        // Ίσως θα έπρεπε, ως validation, να ελέγχουμε αν subperiodsData.length !== subperiods.length.
        // Το πεδίο rent του front-end, αν σταλεί κακόβουλα, αντικαθίσταται με το σωστό από το lease
        const completeSubperiodsData = subperiodsData.map((data, index) => ({
            ...data,        // Δεδομένα από το frontend
            rent: subperiods[index]?.rent || 0     //TODO: αριθμός ή string;
        }));
        
        // Υπολογισμός των πεδίων rent και tax_stamp
        const calculatedFields = calculateRentFields(completeSubperiodsData);

        // Δημιουργία νέου submission
        const newSubmission = await Models.Submission.create({
            period_id: periodId,
            property_id: canteenId,
            property_type: 'canteen',
            principal_id: principalId,
            submittedBy: principalId,
            data: completeSubperiodsData,
            rent: calculatedFields.rent,
            tax_stamp: calculatedFields.tax_stamp
        });

        log.info(`Νέο submission δημιουργήθηκε: Period ${periodId}, Canteen ${canteenId}, Principal ${principalId} (ID: ${newSubmission.id})`);

        // Δημιουργία Log εγγραφής για τη δημιουργία υποβολής
        await Models.Log.create({
            type: 'submission',
            severity: 'info',
            source: req.user.email,
            body: {
                action: 'create',
                submissionId: newSubmission.id,
                periodId: periodId,
                canteenId: canteenId,
                canteenName: canteen.name,
                principalId: principalId,
                principalEmail: req.user.email,
                data: {
                    subperiods: completeSubperiodsData
                },
            }
        });

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
myCanteen.put('/:canteenId/periods/:periodId/submission', async (req, res) => {
    try {
        const canteenId = parseInt(req.params.canteenId);
        const periodId = parseInt(req.params.periodId);
        const { data: subperiodsData } = req.body;
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
                    property_type: 'canteen',
                    active: true
                },
                required: false,
                order: [['lease_end', 'DESC']]
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
            log.warn(`Δεν επιτρέπεται επεξεργασία υποβολών της περιόδου ${period.code} με status ${period.status} (Principal ${principalId}).`);
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
        if (!subperiodsData || !Array.isArray(subperiodsData) || subperiodsData.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Παρακαλώ συμπληρώστε όλα τα απαιτούμενα πεδία'
            });
        }

        // Έλεγχος ότι όλα τα subperiods έχουν τα απαιτούμενα πεδία και είναι αριθμοί
        for (const subperiod of subperiodsData) {
            const students = Number(subperiod.students);
            const workingDays = Number(subperiod.working_days);
            const electricityCost = Number(subperiod.electricity_cost);
            
            if (isNaN(students) || isNaN(workingDays) || isNaN(electricityCost)) {
                return res.status(400).json({
                    success: false,
                    message: 'Παρακαλώ συμπληρώστε όλα τα απαιτούμενα πεδία για όλες τις περιόδους'
                });
            }
        }

        // Πάρε τα subperiods με τα rent values και συγχώνευσε με τα δεδομένα από το frontend
        const subperiods = getSubperiods(period, canteen.leases);
        
        // Συγχώνευση subperiods με subperiodsData
        const completeSubperiodsData = subperiodsData.map((data, index) => ({
            ...data,
            rent: subperiods[index]?.rent || 0          //TODO: αριθμός ή string; 
        }));
        
        // Υπολογισμός των πεδίων rent και tax_stamp
        const calculatedFields = calculateRentFields(completeSubperiodsData);

        // Ενημέρωση του submission
        const updateData = {
            data: completeSubperiodsData,
            rent: calculatedFields.rent,
            tax_stamp: calculatedFields.tax_stamp,
            submittedBy: principalId
        };

        await submission.update(updateData);

        log.info(`Το Submission ενημερώθηκε: Period ${periodId}, Canteen ${canteenId}, Principal ${principalId} (ID: ${submission.id})`);

        // Δημιουργία Log εγγραφής για την ενημέρωση υποβολής
        await Models.Log.create({
            type: 'submission',
            severity: 'info',
            source: req.user.email,
            body: {
                action: 'update',
                submissionId: submission.id,
                periodId: periodId,
                canteenId: canteenId,
                canteenName: canteen.name,
                principalId: principalId,
                principalEmail: req.user.email,
                data: {
                    subperiods: completeSubperiodsData
                },
            }
        });

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