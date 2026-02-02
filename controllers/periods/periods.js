import Models from '../../models/models.js';
// import log from '../logger.js';

/**
 * Μετατρέπει ένα Date object σε string μορφής YYYY-MM-DD
 */
function dateOnly(date) {
    return date.toISOString().split('T')[0];
}

/**
 * Φέρνει την πιο πρόσφατη περίοδο με status 'open' ή 'closed'. 
 * Σημείωση: Το status της περιόδου είναι ένα virtual πεδίο που υπολογίζεται από τις ημερομηνίες και το πεδίο active.
 * Αν το onlyOpen είναι ρητά true, μόνο οι 'open' periods λαμβάνονται υπόψη.
 * 
 * @param {boolean} onlyOpen - Αν είναι true, μόνο οι 'open' periods λαμβάνονται υπόψη.
 * @returns {Promise<object|null>} Η τρέχουσα περίοδος ή null
 */
async function getActiveCanteenPeriod(onlyOpen = false) {
    const recentPeriods = await Models.Period.findAll({
        order: [['end_date', 'DESC']],
        limit: 3,   // Απίθανο να χρειάζονται περισσότερες από 3
    });
    let acceptedStatuses = onlyOpen ? ['open'] : ['open', 'closed'];
    // Θυμίζω ότι το status είναι virtual πεδίο που υπολογίζεται από της ημερομηνίες και από το πεδίο active! 
    return recentPeriods.find(p => acceptedStatuses.includes(p.status)) || null;
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
    let periodStart = new Date(period.start_date);
    let periodEnd = new Date(period.end_date);
    const leaseStart = new Date(lease.lease_start);
    const leaseEnd = new Date(lease.lease_end);
    
    // Περιορισμός της περιόδου στην έναρξη του lease (αν το lease.start_date είναι μετά το period.start_date)
    if (leaseStart > periodStart) {
        periodStart = leaseStart;
    }
    
    // Περιορισμός της περιόδου στη λήξη του lease (αν το lease.end_date είναι πριν το period.end_date)
    if (leaseEnd < periodEnd) {
        periodEnd = leaseEnd;
    }
    
    // Αν το lease δεν επικαλύπτει καθόλου την περίοδο, επιστρέφουμε κενό array
    // Αυτό μπορεί να συμβεί διότι μετά τις προσαρμογές, το periodStart μπορεί να είναι μετά το periodEnd
    if (periodStart > periodEnd) {
        return [];
    }
    
    const rentAdjustments = lease.rent_adjustments;
    const defaultRent = lease.rent;
    
    // Αν δεν υπάρχουν rent adjustments, επιστρέφουμε την ολόκληρη περίοδο
    if (!rentAdjustments || !Array.isArray(rentAdjustments) || rentAdjustments.length === 0) {
        return [{
            start_date: dateOnly(periodStart),
            end_date: dateOnly(periodEnd),
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
            start_date: dateOnly(periodStart),
            end_date: dateOnly(periodEnd),
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
                start_date: dateOnly(currentDate),
                end_date: dateOnly(gapEnd),
                rent: defaultRent
            });
        }
        
        // Δημιουργούμε subperiod για το adjustment (περιορισμένο στην περίοδο)
        const subStart = currentDate > adjStart ? currentDate : adjStart;
        const subEnd = periodEnd < adjEnd ? periodEnd : adjEnd;
        
        subperiods.push({
            start_date: dateOnly(subStart),
            end_date: dateOnly(subEnd),
            rent: adjustment.rent
        });
        
        // Ενημερώνουμε το currentDate για την επόμενη επανάληψη
        currentDate = new Date(subEnd);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Αν υπάρχει υπολειπόμενη περίοδος μετά τα adjustments, χρησιμοποιούμε default rent
    if (currentDate <= periodEnd) {
        subperiods.push({
            start_date: dateOnly(currentDate),
            end_date: dateOnly(periodEnd),
            rent: defaultRent
        });
    }
    
    return subperiods;
}

/**
 * Επιστρέφει σε array το union των subperiods για όλα τα leases και για μία περίοδο.
 * Αν δεν υπάρχουν leases ή δεν προκύψουν subperiods (δηλαδή όλα τα leases είναι "εκτός" περιόδου), 
 * επιστρέφει ένα default array με ένα subperiod με rent: 0.
 * NOTE: Δεν καλύπτεται (με ακρίβεια) η περίπτωση όπου μέρος της περιόδου δεν καλύπτεται από κανένα lease.
 * Ίσως θα πρέπει, μελλοντικά, τα κενά να καλύπτονται με subperiods με rent: 0 
 * (όπως συμβαίνει αν ολόκληρη η περίοδος είναι ακάλυπτη).
 * 
 * @param {object} period - Το period object με start_date και end_date
 * @param {array} leases - Array από lease objects
 * @returns {array} Array από όλα τα subperiods για όλα τα leases
 */
function getSubperiods(period, leases) {

    const defaultSubperiods= [{
        start_date: period.start_date,
        end_date: period.end_date,
        rent: 0
    }];

    // Αν δεν υπάρχουν leases, επιστρέφουμε ένα fallback subperiod με rent: 0
    if (!leases || !Array.isArray(leases) || leases.length === 0) {
        return defaultSubperiods;
    }
    
    const allSubperiods = [];
    
    for (const lease of leases) {
        const leaseSubperiods = subperiodsFor(period, lease);
        allSubperiods.push(...leaseSubperiods);
    }

    if (allSubperiods.length === 0) {
        return defaultSubperiods;
    }
    
    return allSubperiods;
}

/**
 * Helper function για υπολογισμό των πεδίων rent και tax_stamp από subperiods
 * Υπολογισμός rent: άθροισμα του (1/189) * rent * students * working_days για κάθε υποπερίοδο
 * @param {Array} subperiodsData - Array με τα δεδομένα των υποπεριόδων
 * @returns {Object} Αντικείμενο με τα υπολογιζόμενα πεδία, rent και tax_stamp
*/
function calculateRentFields(subperiodsData) {
    //NOTE: Προσοχή. Αν αλλάξει αυτό, να αλλάξει και στο edit-submission.hbs (επεξεργασία υποβολής από χρήστη)
   
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

export { getActiveCanteenPeriod, subperiodsFor, getSubperiods, calculateRentFields };