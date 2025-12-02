import { Router } from 'express';
import Models from '../models/models.js';
import { getActiveCanteenPeriod } from '../controllers/periods/periods.js';
import { can } from '../controllers/roles.js';

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
        let leaseAdjustments = 0;
        const currentYear = new Date().getFullYear();
        const activeCanteenPeriod = { code: null, start: null, end: null, completed: 0, pending: 0 };
        let periodCanteens = 0;
        
        //# 1 Πόσους μήνες θεωρούμε "σύντομα" για λήξη μίσθωσης
        const expiringSoonMonths = 6;
        const expiringSoonMs = expiringSoonMonths * 30 * 24 * 60 * 60 * 1000; // περίπου 6 μήνες
        const expiringSoonDate = new Date(Date.now() + expiringSoonMs);
        const currentMonth = new Date().getMonth() + 1; // 1-12

        
        // Metrics for dashboard

        //# 2 Στατιστικά για τις πρώτες κάρτες του Dashboard
        const [
            activeCanteens,
            activePropertiesAll,
            activeLeases,
        ] = await Promise.all([
            Models.Canteen.count({ where: { active: true } }),
            Models.Property.findAll({
                where: { active: true },
                attributes: ['asset_type'],
                raw: true,
            }),
            Models.Lease.findAll({
                where: { active: true },
                attributes: ['property_type', 'rent_adjustment_month', 'last_rent_adjustment_year', 'lease_end'],
                raw: true
            }),
        ]);

        // Populate objects
        activeProperties.rented = activePropertiesAll.filter(p => p.asset_type === 'rented').length;
        activeProperties.leasedOut = activePropertiesAll.filter(p => p.asset_type === 'leased_out').length;
        activeProperties.owned = activePropertiesAll.filter(p => p.asset_type === 'owned').length;
        activeProperties.sum = activePropertiesAll.length;   // Δεν είναι το άθροισμα των παραπάνω. 
        
        // Filter leases expiring soon
        const leasesExpiringSoonFiltered = activeLeases.filter(l => 
            l.lease_end && new Date(l.lease_end) <= expiringSoonDate
        );
        leasesExpiringSoon.canteens = leasesExpiringSoonFiltered.filter(l => l.property_type === 'canteen').length;
        leasesExpiringSoon.properties = leasesExpiringSoonFiltered.filter(l => l.property_type === 'property').length;
        leasesExpiringSoon.sum = leasesExpiringSoon.canteens + leasesExpiringSoon.properties;
        
        // Filter leases with rent adjustments this month
        leaseAdjustments = activeLeases.filter(l => 
            (l.property_type === 'property') && (l.rent_adjustment_month === currentMonth)
            && (isNaN(l.last_rent_adjustment_year) || l.last_rent_adjustment_year < currentYear)
        ).length;


        //# 3 Αριθμοί για το card για την τρέχουσα περίοδο υποβολών
        const currentPeriod = await getActiveCanteenPeriod();

        if (currentPeriod) {
            activeCanteenPeriod.code = currentPeriod.code;
            activeCanteenPeriod.start = currentPeriod.start_date;
            activeCanteenPeriod.end = currentPeriod.end_date;
            activeCanteenPeriod.name = currentPeriod.name;
            // Οι σωστές canteens για την περίοδο. activeCanteenPeriod = open ή closed (όχι planned ή inactive)
            periodCanteens = (currentPeriod.status=='open') ? activeCanteens : currentPeriod.canteens?.length??0;

            // Υποβολές για αυτή την περίοδο
            activeCanteenPeriod.completed = await Models.Submission.count({
                where: { period_id: currentPeriod.id, property_type: 'canteen' }
            });
            activeCanteenPeriod.pending = periodCanteens - activeCanteenPeriod.completed;
            activeCanteenPeriod.submittedPercent = (periodCanteens > 0) ? Math.round((activeCanteenPeriod.completed / periodCanteens) * 100) : 0;
            
            // Confetti animation όταν όλες οι καντίνες έχουν υποβάλει και η περίοδος είναι ανοιχτή
            activeCanteenPeriod.confetti = (activeCanteenPeriod.completed === periodCanteens) && 
                                           (periodCanteens > 0) && 
                                           (currentPeriod.status === 'open');                        
        }


        //# 4 Render σελίδας
        res.render('dashboard', {
            activeCanteens,     // δεν χρειάζεται το periodCanteens
            activeProperties,
            leasesExpiringSoon,
            leaseAdjustments,
            activeCanteenPeriod
        });
    }



);




export default dashboard;