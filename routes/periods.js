import { Router } from 'express';
import Models from '../models/models.js';
import { can } from '../controllers/roles.js';
import { subperiodsFor, calculateRentFields } from '../controllers/periods/periods.js';
import log from '../controllers/logger.js';

/**
 * Routes for managing periods (canteens only). Path: /canteens/periods
 * @type {Router}
 */

const periods = Router();



//////////////////////////////////////////////////////////////////////////////////////
////////////////////   ROUTES ΓΙΑ ΔΙΑΧΕΙΡΙΣΗ PERIOD SUBMISSIONS   ////////////////////

//* Πρέπει πχ το GET '/:periodId/submissions' να δηλωθεί πριν το GET /:id
// Για αυτό, η σειρά είναι λίγο μπερδεμένη σε αυτό το αρχείο. 


/**
 * GET /periods/:periodId/submissions/:submissionId - Εμφάνιση συγκεκριμένης υποβολής
 */
periods.get('/:periodId/submissions/:submissionId', can('view:content'), async (req, res) => {
    try {
        const periodId = parseInt(req.params.periodId);
        const submissionId = parseInt(req.params.submissionId);
        
        // Βρίσκουμε την περίοδο
        const period = await Models.Period.findByPk(periodId);
        if (!period || period.property_type !== 'canteen') {
            return res.status(404).render('errors/404', { message: 'Η περίοδος κυλικείων δεν βρέθηκε' });
        }
        
        // Βρίσκουμε την υποβολή με όλα τα σχετικά δεδομένα
        const submission = await Models.Submission.findOne({
            where: {
                id: submissionId,
                period_id: periodId,
                property_type: 'canteen'
            },
            include: [
                {
                    model: Models.Canteen,
                    as: 'canteen',
                    include: [
                        {
                            model: Models.Principal,
                            as: 'principal',
                            attributes: ['id', 'name']
                        },
                        {
                            model: Models.Lease,
                            as: 'leases',
                            include: [
                                {
                                    model: Models.Party,
                                    as: 'party',
                                    attributes: ['id', 'name']
                                }
                            ],
                            where: {
                                property_type: 'canteen'
                            },
                            order: [['lease_end', 'DESC']],
                            limit: 1,
                            required: false
                        }
                    ]
                },
                {
                    model: Models.Principal,
                    as: 'submittedByPrincipal',
                    attributes: ['id', 'name'],
                    required: false
                }
            ]
        });
        
        if (!submission) {
            return res.status(404).render('errors/404', { message: 'Η υποβολή δεν βρέθηκε' });
        }
        
        // Πάρε τα αποθηκευμένα δεδομένα από την υποβολή
        const subperiods = submission.data || [];
        
        res.render('periods/edit-submission', {
            period,
            submission,
            canteen: submission.canteen,
            subperiods,
            user: req.user,
            title: `Υποβολή Στοιχείων - ${submission.canteen.name}`
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση υποβολής: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση υποβολής' });
    }
});

/**
 * PUT /periods/:periodId/submissions/:submissionId - Ενημέρωση υποβολής στοιχείων
 */
periods.put('/:periodId/submissions/:submissionId', can('edit:content'), async (req, res) => {
    try {
        const periodId = parseInt(req.params.periodId);
        const submissionId = parseInt(req.params.submissionId);
        
        // Βρίσκουμε την περίοδο
        const period = await Models.Period.findByPk(periodId);
        if (!period || period.property_type !== 'canteen') {
            return res.status(404).json({ 
                success: false, 
                message: 'Η περίοδος κυλικείων δεν βρέθηκε' 
            });
        }
        
        // Βρίσκουμε την υποβολή
        const submission = await Models.Submission.findOne({
            where: {
                id: submissionId,
                period_id: periodId,
                property_type: 'canteen'
            }
        });
        
        if (!submission) {
            return res.status(404).json({ 
                success: false, 
                message: 'Η υποβολή δεν βρέθηκε' 
            });
        }
        
        const { data: subperiodsData } = req.body;
        
        // Βασικός έλεγχος δεδομένων subperiods
        if (!subperiodsData || !Array.isArray(subperiodsData) || subperiodsData.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Απαιτούνται έγκυρα δεδομένα υποπεριόδων'
            });
        }
        
        // Έλεγχος ότι όλα τα subperiods έχουν τα απαιτούμενα πεδία
        for (const subperiod of subperiodsData) {
            if (!subperiod.rent || !subperiod.students || !subperiod.working_days || !subperiod.electricity_cost) {
                return res.status(400).json({
                    success: false,
                    message: 'Όλα τα πεδία των υποπεριόδων είναι υποχρεωτικά'
                });
            }
        }
        
        // Υπολογισμός των πεδίων rent και tax_stamp
        const calculatedFields = calculateRentFields(subperiodsData);
        
        // Ενημέρωση του submission
        await submission.update({
            data: subperiodsData,
            rent: calculatedFields.rent,
            tax_stamp: calculatedFields.tax_stamp
        });
        
        log.info(`Η Υποβολή ${submission.id} ενημερώθηκε για την περίοδο ${period.code}`);
        
        res.json({ 
            success: true, 
            message: 'Η Υποβολή ενημερώθηκε επιτυχώς',
            submission: submission
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ενημέρωση υποβολής: ${error}`);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά την ενημέρωση της Υποβολής' 
        });
    }
});

/**
 * GET /periods/:periodId/logs - Εμφάνιση logs reminders για συγκεκριμένη περίοδο
 */
periods.get('/:periodId/logs', can('view:content'), async (req, res) => {
    try {
        const periodId = parseInt(req.params.periodId);
        
        // Βρίσκουμε την περίοδο
        const period = await Models.Period.findByPk(periodId);
        if (!period || period.property_type !== 'canteen') {
            return res.status(404).render('errors/404', { message: 'Η περίοδος κυλικείων δεν βρέθηκε' });
        }
        
        // Βρίσκουμε τα logs reminders για την περίοδο με JSONB queries
        const logs = await Models.Log.findAll({
            where: {
                type: 'reminder',
                'body.period.id': periodId,
                'body.status': 'sent'
            },
            attributes: ['id', 'type', 'severity', 'body', 'createdAt'],
            order: [['createdAt', 'DESC']]
        });
        
        // Μετασχηματίζουμε τα logs για το view
        const reminderLogs = logs.map(log => ({
            id: log.id,
            createdAt: log.createdAt,
            results: log.body.results,
            canteens: log.body.canteens || []
        }));
        
        res.render('periods/logs', {
            period,
            logs: reminderLogs,
            user: req.user,
            title: `Υπενθυμίσεις - ${period.code}`
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση logs: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση υπενθυμίσεων' });
    }
});

/**
 * GET /periods/:periodId/submissions - Εμφάνιση υποβολών στοιχείων για συγκεκριμένη περίοδο
 */
periods.get('/:periodId/submissions', can('view:content'), async (req, res) => {
    try {
        const periodId = parseInt(req.params.periodId);
        
        //# 1 Βρίσκουμε την περίοδο
        const period = await Models.Period.findByPk(periodId);
        if (!period || period.property_type !== 'canteen') {
            return res.status(404).render('errors/404', { message: 'Η περίοδος κυλικείων δεν βρέθηκε' });
        }
        
        //# 2 Βρίσκουμε όλα τα ενεργά canteens
        const canteens = await Models.Canteen.findAll({
            where: {
                active: true
            },
            include: [
                {
                    model: Models.Principal,
                    as: 'principal',
                    attributes: ['id', 'name','email'],
                },
                {
                    model: Models.Lease,
                    as: 'leases',
                    include: [
                        {
                            model: Models.Party,
                            as: 'party',
                            attributes: ['id', 'name', 'afm']
                        }
                    ],
                    where: {
                        property_type: 'canteen'
                    },
                    order: [['lease_end', 'DESC']],
                    limit: 1,
                    required: false
                },
                {
                    model: Models.Submission,
                    as: 'submissions',
                    attributes: ['id', 'period_id', 'property_id', 'property_type', 'updatedAt', 'rent', 'data', 'electricity_cost'],
                    where: {
                        period_id: periodId,
                        property_type: 'canteen'
                    },
                    required: false
                }
            ],
            order: [['name', 'ASC']]
        });

        //# 3 Μετασχηματίζουμε τα δεδομένα για το view
        const canteensWithSubmissions = canteens.map(canteen => ({
            id: canteen.id,
            name: canteen.name,
            active: canteen.active,
            principal: canteen.principal,
            lease: canteen.leases?.[0] || null,
            party: canteen.leases?.[0]?.party || null,
            hasSubmission: canteen.submissions && canteen.submissions.length > 0,
            submission: canteen.submissions?.[0] || null
        }));
        // log.dev(canteensWithSubmissions);

        //# 4 Ταξινόμηση με βάση τις υποβολές
        // Καντίνες χωρίς υποβολή πρώτες. Μετά, ταξινόμιση κατά submission.updatedAt (χρονική σειρά).
        canteensWithSubmissions.sort((a, b) => {
            const aHas = !!(a.submission);
            const bHas = !!(b.submission);

            // καντίνες χωρίς υποβολή πρώτες
            if (!aHas && bHas) return -1;
            if (aHas && !bHas) return 1;

            // και οι δύο δεν έχουν υποβολή -> διατηρούμε την τρέχουσα σειρά (δεν μας νοιάζει σειρά)
            if (!aHas && !bHas) return 0;

            // και οι δύο έχουν υποβολή - assume updatedAt υπάρχει, oldest first
            return new Date(a.submission.updatedAt) - new Date(b.submission.updatedAt);
        });

        //# 5 Υπολογισμός στατιστικών
        const submittedCount = canteensWithSubmissions.filter(c => c.hasSubmission).length;
        const pendingCount = canteensWithSubmissions.length - submittedCount;
        const submittedPercent = canteensWithSubmissions.length > 0 ? Math.round((submittedCount / canteensWithSubmissions.length) * 100) : 0;

        //# 6 Render
        res.render('periods/submissions', {
            period,
            canteens: canteensWithSubmissions,
            submittedCount,
            submittedPercent,
            pendingCount,
            user: req.user,
            title: `Υποβολές Στοιχείων - ${period.code}`
        });

    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση υποβολών: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση υποβολών' });
    }
});




////////////////////////////////////////////////////////////////////////////////
////////////////////      ROUTES ΓΙΑ ΔΙΑΧΕΙΡΙΣΗ PERIODS     ////////////////////


/**
 * GET /periods - Εμφάνιση λίστας όλων των periods για canteens
 */
periods.get('/', can('view:content'), async (req, res) => {
    try {
        const periods = await Models.Period.findAll({
            where: { property_type: 'canteen' },
            attributes: ['id', 'code', 'name', 'property_type', 'start_date', 'end_date', 'submission_deadline', 'active', 'status', 'createdAt'],
            order: [['end_date', 'DESC']]
        });
        
        res.render('periods/periods', { 
            periods,
            user: req.user,
            title: 'Περίοδοι Κυλικείων'
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση περιόδων: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση περιόδων' });
    }
});


/**
 * GET /periods/:id - Εμφάνιση στοιχείων συγκεκριμένης περιόδου
 */
periods.get('/:id', can('view:content'), async (req, res) => {
    try {
        const periodId = parseInt(req.params.id);
        const period = await Models.Period.findByPk(periodId, {
            attributes: ['id', 'code', 'name', 'property_type', 'start_date', 'end_date', 'submission_deadline', 'active', 'createdAt', 'updatedAt'],
            raw: true
        });
        
        if (!period) {
            return res.status(404).render('errors/404', { message: 'Η περίοδος δεν βρέθηκε' });
        }
        
        // Έλεγχος αν είναι canteen period
        if (period.property_type !== 'canteen') {
            return res.status(404).render('errors/404', { message: 'Η περίοδος δεν είναι για κυλικεία' });
        }
        
        res.render('periods/edit-period', { 
            periodDetails: period,
            user: req.user,
            title: `Περίοδος: ${period.code}`
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση περιόδου: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση της περιόδου' });
    }
});


/**
 * PUT /periods/:id - Ενημέρωση στοιχείων περιόδου
 */
periods.put('/:id', can('edit:content'), async (req, res) => {
    try {
        const periodId = parseInt(req.params.id);
        const { start_date, end_date, submission_deadline, active } = req.body;
        
        const period = await Models.Period.findByPk(periodId);
        if (!period) {
            return res.status(404).json({ 
                success: false, 
                message: 'Η περίοδος δεν βρέθηκε' 
            });
        }
        
        // Έλεγχος αν είναι canteen period
        if (period.property_type !== 'canteen') {
            return res.status(400).json({
                success: false,
                message: 'Η περίοδος δεν είναι για κυλικεία'
            });
        }
        
        // Δημιουργία αντικειμένου ενημέρωσης
        const updateData = {
            start_date: start_date || period.start_date,
            end_date: end_date || period.end_date,
            submission_deadline: submission_deadline || period.submission_deadline,
            active: active !== undefined ? active : period.active
        };
        
        await period.update(updateData);
        
        log.info(`Η Περίοδος ${period.code} ενημερώθηκε (ID: ${period.id})`);
        
        res.json({ 
            success: true, 
            message: 'Η Περίοδος ενημερώθηκε επιτυχώς',
            period: {
                id: period.id,
                code: period.code,
                property_type: period.property_type,
                start_date: period.start_date,
                end_date: period.end_date,
                submission_deadline: period.submission_deadline,
                active: period.active
            }
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ενημέρωση περιόδου: ${error}`);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά την ενημέρωση της Περιόδου' 
        });
    }
});


////////////////////////////////////////////////////////////////////////////////
////////////////////           ROUTES ΓΙΑ SUBMISSIONS       ////////////////////

/**
 * GET /canteens/submissions/new - Φόρμα για δημιουργία νέας υποβολής
 * Χρησιμοποιείται από το link στο submissions template
 */
periods.get('/submissions/new', can('edit:content'), async (req, res) => {
    try {
        const periodId = parseInt(req.query.period_id);
        const canteenId = parseInt(req.query.canteen_id);
        
        if (!periodId || !canteenId) {
            return res.status(400).render('errors/400', { message: 'Απαιτούνται period_id και canteen_id' });
        }
        
        // Βρίσκουμε την περίοδο
        const period = await Models.Period.findByPk(periodId);
        if (!period || period.property_type !== 'canteen') {
            return res.status(404).render('errors/404', { message: 'Η περίοδος κυλικείων δεν βρέθηκε' });
        }
        
        // Βρίσκουμε το κυλικείο
        const canteen = await Models.Canteen.findByPk(canteenId, {
            include: [
                {
                    model: Models.Principal,
                    as: 'principal',
                    attributes: ['id', 'name']
                },
                {
                    model: Models.Lease,
                    as: 'leases',
                    include: [
                        {
                            model: Models.Party,
                            as: 'party',
                            attributes: ['id', 'name']
                        }
                    ],
                    where: {
                        property_type: 'canteen'
                    },
                    order: [['lease_end', 'DESC']],
                    limit: 1,
                    required: false
                }
            ]
        });

        if (!canteen) {
            return res.status(404).render('errors/404', { message: 'Το κυλικείο δεν βρέθηκε' });
        }

        // Έλεγχος αν υπάρχει ήδη υποβολή για αυτήν την περίοδο και κυλικείο
        const existingSubmission = await Models.Submission.findOne({
            where: {
                period_id: periodId,
                property_id: canteenId,
                property_type: 'canteen'
            }
        });

        if (existingSubmission) {
            return res.redirect(`/canteens/periods/${periodId}/submissions/${existingSubmission.id}`);
        }

        // Πάρε το πιο πρόσφατο lease και δημιούργησε subperiods
        const latestLease = canteen.leases?.[0];
        const subperiods = latestLease ? subperiodsFor(period, latestLease) : [{
            start_date: period.start_date,
            end_date: period.end_date,
            rent: 0
        }];

        res.render('periods/edit-submission', {
            period,
            canteen,
            submission: null,
            subperiods,
            newSubmission: true,
            user: req.user,
            title: `Νέα Υποβολή - ${canteen.name}`
        });
    } catch (error) {
        log.error(`Σφάλμα κατά τη φόρτωση φόρμας νέας υποβολής: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά τη φόρτωση της φόρμας' });
    }
});

/**
 * POST /canteens/submissions - Δημιουργία νέας υποβολής στοιχείων
 */
periods.post('/submissions', can('edit:content'), async (req, res) => {
    try {
        const { period_id, canteen_id, data: subperiodsData, principal_id } = req.body;
        
        if (!period_id || !canteen_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Απαιτούνται period_id και canteen_id' 
            });
        }
        
        // Βρίσκουμε την περίοδο
        const period = await Models.Period.findByPk(period_id);
        if (!period || period.property_type !== 'canteen') {
            return res.status(404).json({ 
                success: false, 
                message: 'Η περίοδος κυλικείων δεν βρέθηκε' 
            });
        }
        
        // Βρίσκουμε το κυλικείο
        const canteen = await Models.Canteen.findByPk(canteen_id);
        if (!canteen) {
            return res.status(404).json({ 
                success: false, 
                message: 'Το κυλικείο δεν βρέθηκε' 
            });
        }
        
        // Έλεγχος αν υπάρχει ήδη υποβολή
        const existingSubmission = await Models.Submission.findOne({
            where: {
                period_id: period_id,
                property_id: canteen_id,
                property_type: 'canteen'
            }
        });
        
        if (existingSubmission) {
            return res.status(400).json({
                success: false,
                message: 'Υπάρχει ήδη υποβολή για αυτήν την περίοδο και κυλικείο'
            });
        }
        
        // Βασικός έλεγχος δεδομένων subperiods
        if (!subperiodsData || !Array.isArray(subperiodsData) || subperiodsData.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Απαιτούνται έγκυρα δεδομένα υποπεριόδων'
            });
        }
        
        // Έλεγχος ότι όλα τα subperiods έχουν τα απαιτούμενα πεδία
        for (const subperiod of subperiodsData) {
            if (!subperiod.rent || !subperiod.students || !subperiod.working_days || !subperiod.electricity_cost) {
                return res.status(400).json({
                    success: false,
                    message: 'Όλα τα πεδία των υποπεριόδων είναι υποχρεωτικά'
                });
            }
        }
        
        // Υπολογισμός των πεδίων rent και tax_stamp
        const calculatedFields = calculateRentFields(subperiodsData);
        
        // Δημιουργία νέας υποβολής
        const newSubmission = await Models.Submission.create({
            period_id: period_id,
            property_id: canteen_id,
            property_type: 'canteen',
            principal_id: principal_id || null,
            data: subperiodsData,
            rent: calculatedFields.rent,
            tax_stamp: calculatedFields.tax_stamp
        });
        
        log.info(`Νέα Υποβολή δημιουργήθηκε (ID: ${newSubmission.id}) για κυλικείο ${canteen.name} και περίοδο ${period.code}`);
        
        res.json({ 
            success: true, 
            message: 'Η Υποβολή δημιουργήθηκε επιτυχώς',
            submission: newSubmission,
            redirectUrl: `/canteens/periods/${period_id}/submissions/${newSubmission.id}`
        });
    } catch (error) {
        log.error(`Σφάλμα κατά τη δημιουργία υποβολής: ${error}`);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά τη δημιουργία της Υποβολής' 
        });
    }
});


export default periods;