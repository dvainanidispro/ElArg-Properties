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

export { getActiveCanteenPeriod };