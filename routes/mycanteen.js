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

export default myCanteen;