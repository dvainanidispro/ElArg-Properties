import { Router } from 'express';
import Models from '../models/models.js';
import { can } from '../controllers/roles.js';
import { getSubperiods, calculateRentFields, aggregateSubperiodsByLease } from '../controllers/periods/periods.js';
import { generatePeriod, justShowNextPeriod } from '../controllers/periods/generate.js';
import log from '../controllers/logger.js';
import TableData from '../controllers/queries.js';

/**
 * Routes for managing periods (canteens only). Path: /canteens/periods
 * @type {Router}
 * 
 * Available routes: 
 * 
 * PERIODS
 * - GET    /                       - Εμφάνιση λίστας όλων των periods για canteens
 * - POST   /generate               - Δημιουργία νέας περιόδου
 * - GET    /:id                    - Εμφάνιση στοιχείων συγκεκριμένης περιόδου
 * - PUT    /:id                    - Ενημέρωση στοιχείων περιόδου
 * - GET    /:id/logs               - Εμφάνιση logs reminders για συγκεκριμένη περίοδο
 * 
 * CREATE SUBMISSIONS
 * - GET    /submissions/new        - Φόρμα για δημιουργία νέας υποβολής
 * - POST   /submissions            - Δημιουργία νέας υποβολής στοιχείων
 * 
 * PERIOD SUBMISSIONS
 * - GET    /:periodId/submissions                  - Εμφάνιση υποβολών στοιχείων για συγκεκριμένη περίοδο
 * - GET    /:periodId/submissions/:submissionId    - Εμφάνιση συγκεκριμένης υποβολής
 * - PUT    /:periodId/submissions/:submissionId    - Ενημέρωση υποβολής στοιχείων
 */

const periods = Router();






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

        const nextPeriodId = justShowNextPeriod()?.code ?? null;
        const showNextPeriodButton = nextPeriodId && !periods.some(p => p.code === nextPeriodId);
        
        res.render('periods/periods', { 
            periods,
            showNextPeriodButton,
            user: req.user,
            title: 'Περίοδοι Κυλικείων'
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση περιόδων: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση περιόδων' });
    }
});


/**
 * POST /periods/generate - Δημιουργία νέας περιόδου
 */
periods.post('/generate', can('edit:content'), async (req, res) => {
    log.info('Αίτημα για δημιουργία νέας περιόδου κυλικείων');
    try {
        await generatePeriod();
        res.json({ success: true, message: 'Η διαδικασία ολοκληρώθηκε' });
    } catch (error) {
        log.error(`Σφάλμα κατά τη δημιουργία περιόδου: ${error}`);
        res.status(500).json({ success: false, message: 'Σφάλμα κατά τη δημιουργία περιόδου' });
    }
});


/**
 * GET /periods/:id - Εμφάνιση στοιχείων συγκεκριμένης περιόδου
 */
periods.get('/:id', can('view:content'), async (req, res, next) => {
    try {
        const periodId = parseInt(req.params.id);
        if (isNaN(periodId)) {
            return next();
        }
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



/**
 * GET /periods/:id/logs - Εμφάνιση logs reminders για συγκεκριμένη περίοδο
 */
periods.get('/:id/logs', can('view:content'), async (req, res) => {
    try {
        const periodId = parseInt(req.params.id);
        
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
            emailServer: process.env.EMAILHOST,
            title: `Υπενθυμίσεις - ${period.code}`
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση logs: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση υπενθυμίσεων' });
    }
});






//////////////////////////////////////////////////////////////////////////////////
/////////////////        ROUTES ΓΙΑ ΔΗΜΙΟΥΡΓΙΑ SUBMISSIONS       /////////////////


/**
 * GET /canteens/submissions/new - Φόρμα για δημιουργία νέας υποβολής
 * Χρησιμοποιείται από το link στο submissions template
 */
periods.get('/submissions/new', can('edit:content'), async (req, res) => {
    try {
        const periodId = parseInt(req.query.period_id);
        const canteenId = parseInt(req.query.canteen_id);
        
        if (!periodId || !canteenId) {
            return res.status(400).render('errors/404', { message: 'Απαιτούνται period_id και canteen_id' });
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
                        property_type: 'canteen',
                        active: true
                    },
                    order: [['lease_end', 'DESC']],
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

        // Δημιούργησε subperiods για όλα τα ενεργά leases
        const subperiods = getSubperiods(period, canteen.leases);

        // Party και lease για εύκολη πρόσβαση στο view
        const allParties = await TableData.Party;
        const partyMap = new Map(allParties.map(p => [p.id, p]));
        subperiods.forEach(subperiod => {
            subperiod.party = subperiod.party_id ? partyMap.get(subperiod.party_id) : null;
        });

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
        const canteen = await Models.Canteen.findByPk(canteen_id, {
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
        
        // Έλεγχος ότι όλα τα subperiods έχουν τα απαιτούμενα πεδία και είναι αριθμοί
        for (const subperiod of subperiodsData) {
            const rent = Number(subperiod.rent);
            const students = Number(subperiod.students);
            const workingDays = Number(subperiod.working_days);
            const electricityCost = Number(subperiod.electricity_cost);
            
            if (isNaN(rent) || isNaN(students) || isNaN(workingDays) || isNaN(electricityCost)) {
                return res.status(400).json({
                    success: false,
                    message: 'Όλα τα πεδία των υποπεριόδων είναι υποχρεωτικά'
                });
            }
        }

        // Πάρε τα subperiods και συγχώνευσε με τα δεδομένα από το frontend
        const subperiods = getSubperiods(period, canteen.leases);
        
        // Τα πεδία lease_id και party_id συμπληρώνονται από το getSubperiods
        const completeSubperiodsData = subperiodsData.map((data, index) => ({
            ...data,        // Δεδομένα από το frontend (συμπεριλαμβανομένου του rent)
            lease_id: subperiods[index]?.lease_id,
            party_id: subperiods[index]?.party_id
        }));
        
        // Υπολογισμός των πεδίων rent και tax_stamp
        const calculatedFields = calculateRentFields(completeSubperiodsData);
        
        // Δημιουργία νέας υποβολής
        const newSubmission = await Models.Submission.create({
            period_id: period_id,
            property_id: canteen_id,
            property_type: 'canteen',
            principal_id: principal_id || null,
            data: completeSubperiodsData,
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







//////////////////////////////////////////////////////////////////////////////////////
////////////////////   ROUTES ΓΙΑ ΔΙΑΧΕΙΡΙΣΗ PERIOD SUBMISSIONS   ////////////////////



/**
 * GET /periods/:periodId/submissions - Εμφάνιση υποβολών στοιχείων για συγκεκριμένη περίοδο
 */
periods.get(['/:periodId/submissions','/:periodId/subperiods'], can('view:content'), async (req, res) => {
    try {
        const periodId = parseInt(req.params.periodId);
        const showSubperiods = req.path.includes('subperiods');
        
        //# 1 Βρίσκουμε την περίοδο
        const period = await Models.Period.findByPk(periodId);
        if (!period || period.property_type !== 'canteen') {
            return res.status(404).render('errors/404', { message: 'Η περίοδος κυλικείων δεν βρέθηκε' });
        }
        
        //# 2 Βρίσκουμε όλα τα canteens της περιόδου 
        // Αν η περίδος είναι η ενεργή ή προγραμματισμένη, τότε όλα τα ενεργά canteens
        // Αν η περίοδος είναι κλειστή, τότε μόνο τα canteens που είναι αποθηκευμένα στην database εγγραφή της περιόδου
        
        /** Το φίλτρο για το ποιες canteens είναι οι αυτές που πρέπει για την περίοδο */
        let filter = {};   
        // Δυνατές τιμές για period.status: 'planned', 'open', 'closed' 'inactive'
        if (period.status == 'open' || period.status == 'planned') {
            filter = { active: true };
        } else if (period.status == 'closed') {
            filter = { id: period.canteens || [] };    // το id ανήκει στα (SQL "WHERE id IN ...") canteen id της περιόδου
        } else if (period.status == 'inactive') {
            filter = (period.canteens?.length) ? { id: period.canteens } : { active: true };
        }
        // log.dev(filter);

        const canteens = await Models.Canteen.findAll({
            where: filter,
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
                    limit: 5,
                    required: false
                },
                {
                    model: Models.Submission,
                    as: 'submissions',
                    attributes: ['id', 'period_id', 'property_id', 'property_type', 'updatedAt', 'rent', 'data', 'electricity_cost'],
                    include: [
                        {
                            model: Models.Principal,
                            as: 'principal',
                            attributes: ['id', 'name', 'email'],
                            required: false
                        }
                    ],
                    where: {
                        period_id: periodId,
                        property_type: 'canteen'
                    },
                    required: false
                }
            ],
            order: [['name', 'ASC']]
        });

        //# 3 Φέρε ολόκληρους τους πίνακες leases και parties για join με submittedSubperiods
        const [allLeases, allParties] = await Promise.all([
            TableData.Lease,
            TableData.Party
        ]);
        
        // Δημιουργία maps για γρήγορη αναζήτηση
        const leaseMap = new Map(allLeases.map(l => [l.id, l]));
        const partyMap = new Map(allParties.map(p => [p.id, p]));
        
        //# 4 Μετασχηματίζουμε τα δεδομένα για το view
        const canteensWithSubmissions = canteens.map(canteen => {
            const submission = canteen.submissions?.[0] || null;
            const submittedSubperiods = submission?.data ?? [];

            const subperiods = getSubperiods(period, canteen.leases, false);
            subperiods.forEach(subperiod => {
                subperiod.party = subperiod.party_id ? partyMap.get(subperiod.party_id) : null;
            });
            const subperiodPartyNames = subperiods.map(sp => sp.party.name);

            if (submission) {
            
                submission.arrayOf = submittedSubperiods.length ? aggregateSubperiodsByLease(submittedSubperiods) : {};
                // log.dev(submission.arrayOf);
                // Στο arrayOf πρέπει να προστεθούν τα partyNames και PartyAfm μέσω του partyMap καθώς και το leaseEnd από το leaseMap
                submission.arrayOf.partyNames = submission.arrayOf.partyIds.map(partyId => {
                    const party = partyMap.get(partyId);
                    return party ? party.name : 'Άγνωστο';
                }) || [];
                submission.arrayOf.leaseEnds = submission.arrayOf.leaseIds?.map(leaseId => {
                    const lease = leaseMap.get(leaseId);
                    return lease ? new Intl.DateTimeFormat('el-GR', { 
                        day: 'numeric', 
                        month: 'numeric', 
                        year: 'numeric',
                        timeZone: 'Europe/Athens' 
                    }).format(new Date(lease.lease_end)) : 'Άγνωστο';
                }) || [];
                submission.arrayOf.partyAfms = submission.arrayOf.leaseIds?.map(leaseId => {
                    const lease = leaseMap.get(leaseId);
                    return lease ? partyMap.get(lease.party_id)?.afm || 'Άγνωστο' : 'Άγνωστο';
                }) || [];
                submission.hasMultipleParties = submission.arrayOf.partyIds?.length > 1;

            }
            
            return {
                id: canteen.id,
                name: canteen.name,
                active: canteen.active,
                principal: period.status === 'closed' 
                    ? (submission?.principal || null)
                    : (submission?.principal ?? canteen.principal),
                // lease: canteen.leases?.[0] || null,     // τρέχον lease
                // party: canteen.leases?.[0]?.party || null,  // τρέχον party
                hasSubmission: canteen.submissions && canteen.submissions.length > 0,  // Αν δεν βάλεις >0, θα έρθει 1 αντί για true
                submission,
                submittedSubperiods,
                subperiods,
                subperiodPartyNames,
            };
        });
        // log.dev(canteensWithSubmissions);

        //# 5 Ταξινόμηση με βάση τις υποβολές
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

        //# 6 Υπολογισμός στατιστικών
        const submittedCount = canteensWithSubmissions.filter(c => c.hasSubmission).length;
        const pendingCount = canteensWithSubmissions.length - submittedCount;
        const submittedPercent = canteensWithSubmissions.length > 0 ? Math.round((submittedCount / canteensWithSubmissions.length) * 100) : 0;

        //# 7 Render
        res.render(showSubperiods ? 'periods/subperiods' : 'periods/submissions', {
            period,
            canteens: canteensWithSubmissions,
            submittedCount,
            submittedPercent,
            pendingCount,
            user: req.user,
            title: showSubperiods ? `Υποπερίοδοι Κυλικείων - ${period.code}` : `Υποβολές Στοιχείων - ${period.code}`
        });

    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση υποβολών: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση υποβολών' });
    }
});




/**
 * GET /periods/:periodId/submissions/:submissionId - Εμφάνιση συγκεκριμένης υποβολής
 */
periods.get('/:periodId/submissions/:submissionId', can('view:content'), async (req, res) => {
    try {
        const periodId = parseInt(req.params.periodId);
        const submissionId = parseInt(req.params.submissionId);
        
        //# 1 Βρίσκουμε την περίοδο
        const period = await Models.Period.findByPk(periodId);
        if (!period || period.property_type !== 'canteen') {
            return res.status(404).render('errors/404', { message: 'Η περίοδος κυλικείων δεν βρέθηκε' });
        }
        
        //# 2 Βρίσκουμε την υποβολή με όλα τα σχετικά δεδομένα
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
                    as: 'principal',
                    attributes: ['id', 'name', 'email'],
                    required: false
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

        //# 3 Καθορισμός του principal με βάση το status της περιόδου
        submission.canteen.principal = period.status === 'closed'
            ? (submission.principal || null)
            : (submission.principal ?? submission.canteen.principal);
        
        //# 4 Για κάθε συμπληρωμένη υποπερίοδο, φέρνουμε party και καθαρό μίσθωμα υποπεριόδου
        const allParties = await TableData.Party;
        const partyMap = new Map(allParties.map(p => [p.id, p]));
        
        const subperiods = (submission.data || []).map(subperiod => ({
            ...subperiod,
            party: subperiod.party_id ? partyMap.get(subperiod.party_id) : null,
            calculated_rent: calculateRentFields([subperiod]).rent
        }));

        
        
        //# 5 Render
        res.render('periods/edit-submission', {
            period,
            submission,
            canteen: submission.canteen,
            subperiods,
            moreThanOneSubperiod: subperiods.length > 1,
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
            },
            include: [{
                model: Models.Canteen,
                as: 'canteen',
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
            }]
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
        
        // Έλεγχος ότι όλα τα subperiods έχουν τα απαιτούμενα πεδία και είναι αριθμοί
        for (const subperiod of subperiodsData) {
            const rent = Number(subperiod.rent);
            const students = Number(subperiod.students);
            const workingDays = Number(subperiod.working_days);
            const electricityCost = Number(subperiod.electricity_cost);
            
            if (isNaN(rent) || isNaN(students) || isNaN(workingDays) || isNaN(electricityCost)) {
                return res.status(400).json({
                    success: false,
                    message: 'Όλα τα πεδία των υποπεριόδων είναι υποχρεωτικά'
                });
            }
        }
        
        // Πάρε τα subperiods με τα lease_id και party_id και συγχώνευσε με τα δεδομένα από το frontend
        const subperiods = getSubperiods(period, submission.canteen.leases);
        
        // Συγχώνευση subperiods με subperiodsData
        const completeSubperiodsData = subperiodsData.map((data, index) => ({
            ...data,        // Δεδομένα από το frontend (συμπεριλαμβανομένου του rent)
            lease_id: subperiods[index]?.lease_id,
            party_id: subperiods[index]?.party_id
        }));
        
        // Υπολογισμός των πεδίων rent και tax_stamp
        const calculatedFields = calculateRentFields(completeSubperiodsData);
        
        // Ενημέρωση του submission
        await submission.update({
            data: completeSubperiodsData,
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





export default periods;