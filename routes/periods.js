import { Router } from 'express';
import { Op } from 'sequelize';
import Models from '../models/models.js';
import { can } from '../controllers/roles.js';
import log from '../controllers/logger.js';

/**
 * Routes for managing periods (canteens only).
 * @type {Router}
 */

const periods = Router();




//////////////////////////////////////////////////////////////////////////////////////
////////////////////   ROUTES ΓΙΑ ΔΙΑΧΕΙΡΙΣΗ PERIOD SUBMISSIONS   ////////////////////

//* Πρέπει πχ το GET '/:periodId/submissions' να δηλωθεί πριν το GET /:id


/**
 * GET /periods/:periodId/submissions - Εμφάνιση υποβολών στοιχείων για συγκεκριμένη περίοδο
 */
periods.get('/:periodId/submissions', can('view:content'), async (req, res) => {
    try {
        const periodId = parseInt(req.params.periodId);
        
        // Βρίσκουμε την περίοδο
        const period = await Models.Period.findByPk(periodId);
        if (!period || period.property_type !== 'canteen') {
            return res.status(404).render('errors/404', { message: 'Η περίοδος κυλικείων δεν βρέθηκε' });
        }
        
        // Βρίσκουμε όλα τα ενεργά canteens  TODO: Περιορισμός μόνο σε canteens με ενεργό lease
        const canteens = await Models.Canteen.findAll({
            where: {
                active: true
            },
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
                },
                {
                    model: Models.Submission,
                    as: 'submissions',
                    attributes: ['id', 'period_id', 'property_id', 'property_type', 'createdAt', 'updatedAt'],
                    where: {
                        period_id: periodId,
                        property_type: 'canteen'
                    },
                    required: false
                }
            ],
            order: [['name', 'ASC']]
        });

        // Μετασχηματίζουμε τα δεδομένα για το view
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

        // Υπολογισμός στατιστικών
        const submittedCount = canteensWithSubmissions.filter(c => c.hasSubmission).length;
        const pendingCount = canteensWithSubmissions.length - submittedCount;

        res.render('periods/submissions', {
            period,
            canteens: canteensWithSubmissions,
            submittedCount,
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
            attributes: ['id', 'code', 'property_type', 'start_date', 'end_date', 'submission_deadline', 'active', 'status', 'createdAt'],
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
            attributes: ['id', 'code', 'property_type', 'start_date', 'end_date', 'submission_deadline', 'active', 'createdAt', 'updatedAt'],
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










export default periods;