import Models from '../../models/models.js';

/**
 * Finds the most recent period with status 'open' or 'closed'.
 * @returns {Promise<object|null>} The current period or null
 */
async function getActiveCanteenPeriod() {
    const recentPeriods = await Models.Period.findAll({
        order: [['end_date', 'DESC']],
        limit: 3,   // Απίθανο να χρειάζονται περισσότερες από 3
    });
    return recentPeriods.find(p => ['open', 'closed'].includes(p.status)) || null;
}

/**
 * Δημιουργεί subperiods για μια περίοδο με βάση τα rent adjustments του lease.
 * 
 * @param {object} period - Το period object με start_date και end_date
 * @param {object} lease - Το lease object με rent και rent_adjustments
 * @returns {array} Array από objects με start_date, end_date και rent για κάθε subperiod
 * 
 * @example
 * // Lease με rent=400 και adjustments
 * const lease = {
 *   rent: 400.00,
 *   rent_adjustments: [
 *     { start_date: "2024-04-01", end_date: "2024-06-30", rent: 450.00 },
 *     { start_date: "2024-09-01", end_date: "2024-11-30", rent: 500.00 }
 *   ]
 * };
 * 
 * const period = { start_date: "2024-01-01", end_date: "2024-12-31" };
 * 
 * const subperiods = subperiodsFor(period, lease);
 * // Αποτέλεσμα:
 * // [
 * //   { start_date: "2024-01-01", end_date: "2024-03-31", rent: 400.00 },
 * //   { start_date: "2024-04-01", end_date: "2024-06-30", rent: 450.00 },
 * //   { start_date: "2024-07-01", end_date: "2024-08-31", rent: 400.00 },
 * //   { start_date: "2024-09-01", end_date: "2024-11-30", rent: 500.00 },
 * //   { start_date: "2024-12-01", end_date: "2024-12-31", rent: 400.00 }
 * // ]
 */
function subperiodsFor(period, lease) {
    const periodStart = new Date(period.start_date);
    const periodEnd = new Date(period.end_date);
    const rentAdjustments = lease.rent_adjustments;
    const defaultRent = lease.rent;
    
    // Αν δεν υπάρχουν rent adjustments, επιστρέφουμε την ολόκληρη περίοδο
    if (!rentAdjustments || !Array.isArray(rentAdjustments) || rentAdjustments.length === 0) {
        return [{
            start_date: period.start_date,
            end_date: period.end_date,
            rent: defaultRent
        }];
    }
    
    // Φιλτράρουμε και ταξινομούμε τα adjustments που επικαλύπτουν την περίοδο
    const relevantAdjustments = rentAdjustments
        .filter(adj => {
            const adjStart = new Date(adj.start_date);
            const adjEnd = new Date(adj.end_date);
            // Κρατάμε μόνο τα adjustments που επικαλύπτουν την περίοδο
            return adjStart <= periodEnd && adjEnd >= periodStart;
        })
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    
    // Αν κανένα adjustment δεν επικαλύπτει την περίοδο, επιστρέφουμε την ολόκληρη περίοδο
    if (relevantAdjustments.length === 0) {
        return [{
            start_date: period.start_date,
            end_date: period.end_date,
            rent: defaultRent
        }];
    }
    
    const subperiods = [];
    let currentDate = periodStart;
    
    for (const adjustment of relevantAdjustments) {
        const adjStart = new Date(adjustment.start_date);
        const adjEnd = new Date(adjustment.end_date);
        
        // Αν υπάρχει κενό πριν από το adjustment, δημιουργούμε subperiod με default rent
        if (currentDate < adjStart) {
            const gapEnd = new Date(adjStart);
            gapEnd.setDate(gapEnd.getDate() - 1); // Μια μέρα πριν από το adjustment
            
            subperiods.push({
                start_date: currentDate.toISOString().split('T')[0],
                end_date: gapEnd.toISOString().split('T')[0],
                rent: defaultRent
            });
        }
        
        // Δημιουργούμε subperiod για το adjustment (περιορισμένο στην περίοδο)
        const subStart = currentDate > adjStart ? currentDate : adjStart;
        const subEnd = periodEnd < adjEnd ? periodEnd : adjEnd;
        
        subperiods.push({
            start_date: subStart.toISOString().split('T')[0],
            end_date: subEnd.toISOString().split('T')[0],
            rent: adjustment.rent
        });
        
        // Ενημερώνουμε το currentDate για την επόμενη επανάληψη
        currentDate = new Date(subEnd);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Αν υπάρχει υπολειπόμενη περίοδος μετά τα adjustments, χρησιμοποιούμε default rent
    if (currentDate <= periodEnd) {
        subperiods.push({
            start_date: currentDate.toISOString().split('T')[0],
            end_date: period.end_date,
            rent: defaultRent
        });
    }
    
    return subperiods;
}

/**
 * Helper function για υπολογισμό των πεδίων rent και tax_stamp από subperiods
 * @param {Array} subperiodsData - Array με τα δεδομένα των υποπεριόδων
 * @returns {Object} Αντικείμενο με τα υπολογιζόμενα πεδία
 */
function calculateRentFields(subperiodsData) {
    // Υπολογισμός rent: άθροισμα του (1/189) * rent * students * working_days για κάθε υποπερίοδο
    let rent = 0;
    subperiodsData.forEach(subperiod => {
        const subperiodRent = (1/189) * subperiod.rent * subperiod.students * subperiod.working_days;
        rent += subperiodRent;
    });
    
    // Υπολογισμός tax_stamp: rent * 0.036
    const taxStamp = rent * 0.036;
    
    return {
        rent: parseFloat(rent.toFixed(2)),
        tax_stamp: parseFloat(taxStamp.toFixed(2))
    };
}

export { getActiveCanteenPeriod, subperiodsFor, calculateRentFields };