import { Router } from 'express';
import Models from '../models/models.js';
import { getActiveCanteenPeriod } from '../controllers/periods/periods.js';
import { can } from '../controllers/roles.js';
import log from '../controllers/logger.js';
import { Op } from 'sequelize';

const dashboard = Router();



// Αρχική σελίδα (dashboard)
dashboard.get(['/', '/dashboard'], 

    // Redirect principals to their canteen page
    (req, res, next) => {
        let userRole = req.user ? req.user.role : 'guest';
        if (userRole === 'principal') {
            res.redirect('/canteens/mycanteen');
            return;
        }
        next();
    },

    // Show dashboard to users
    can('view:content'),
    async (req, res) => {

        // Αρχικοποίηση αντικειμένων για τα cards
        const activeProperties = { sum: 0, rented: 0, leasedOut: 0 };
        const leasesExpiringSoon = { sum: 0, canteens: 0, properties: 0 };
        const activeCanteenPeriod = { code: null, start: null, end: null, completed: 0, pending: 0 };
        
        //# 1 Πόσους μήνες θεωρούμε "σύντομα" για λήξη μίσθωσης
        const expiringSoonMonths = 6;
        const expiringSoonMs = expiringSoonMonths * 30 * 24 * 60 * 60 * 1000; // περίπου 6 μήνες
        const expiringSoonDate = new Date(Date.now() + expiringSoonMs);

        
        // Metrics for dashboard

        //# 2 Στατιστικά για τις πρώτες κάρτες του Dashboard
        const [
            activeCanteens,
            activePropertiesAll,
            leasesExpiringSoonAll,
        ] = await Promise.all([
            Models.Canteen.count({ where: { active: true } }),
            Models.Property.findAll({
                where: { active: true },
                attributes: ['asset_type'],
                raw: true
            }),
            Models.Lease.findAll({
                where: {
                    active: true,
                    lease_end: { [Op.lte]: expiringSoonDate }
                },
                attributes: ['property_type'],
                raw: true
            }),
        ]);

        // Populate objects
        activeProperties.rented = activePropertiesAll.filter(p => p.asset_type === 'rented').length;
        activeProperties.leasedOut = activePropertiesAll.filter(p => p.asset_type === 'leased_out').length;
        activeProperties.sum = activeProperties.rented + activeProperties.leasedOut;
        leasesExpiringSoon.canteens = leasesExpiringSoonAll.filter(l => l.property_type === 'canteen').length;
        leasesExpiringSoon.properties = leasesExpiringSoonAll.filter(l => l.property_type === 'property').length;
        leasesExpiringSoon.sum = leasesExpiringSoon.canteens + leasesExpiringSoon.properties;


        //# 3 Αριθμοί για το card για την τρέχουσα περίοδο υποβολών
        const currentPeriod = await getActiveCanteenPeriod();

        if (currentPeriod) {
            activeCanteenPeriod.code = currentPeriod.code;
            activeCanteenPeriod.start = currentPeriod.start_date;
            activeCanteenPeriod.end = currentPeriod.end_date;

            // Υποβολές για αυτή την περίοδο
            activeCanteenPeriod.completed = await Models.Submission.count({
                where: { period_id: currentPeriod.id, property_type: 'canteen' }
            });
            activeCanteenPeriod.pending = activeCanteens - activeCanteenPeriod.completed;
            activeCanteenPeriod.submittedPercent = activeCanteens > 0 ? Math.round((activeCanteenPeriod.completed / activeCanteens) * 100) : 0;
        }


        //# 4 Render σελίδας
        res.render('dashboard', {
            activeCanteens,
            activeProperties,
            leasesExpiringSoon,
            activeCanteenPeriod
        });
    }



);




export default dashboard;