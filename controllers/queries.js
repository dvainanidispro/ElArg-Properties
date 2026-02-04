import Models from '../models/models.js';

/**
 * Cache για τα table data
 * @type {Map<string, Array>}
 */
const cache = new Map();

/**
 * Timeouts για καθαρισμό του cache
 * @type {Map<string, NodeJS.Timeout>}
 */
const timeouts = new Map();

/**
 * Διάρκεια cache σε milliseconds, default 1 ώρα
 */
const CACHE_DURATION = (parseInt(process.env.CACHETABLESDURATION) || 60) * 60 * 1000;

/**
 * Καθαρίζει το cache για ένα συγκεκριμένο table
 * @param {string} tableName - Το όνομα του table
 */
function clearCache(tableName) {
    cache.delete(tableName);
    if (timeouts.has(tableName)) {
        clearTimeout(timeouts.get(tableName));
        timeouts.delete(tableName);
    }
}

/**
 * Φέρνει τα data από το table (με caching)
 * @param {string} tableName - Το όνομα του table (π.χ. 'Lease', 'Party')
 * @returns {Promise<Array>}
 */
async function getTableData(tableName) {
    // Έλεγχος αν υπάρχει cached data
    if (cache.has(tableName)) {
        return cache.get(tableName);
    }
    
    // Έλεγχος αν το model υπάρχει
    const Model = Models[tableName];
    if (!Model) {
        throw new Error(`Model ${tableName} δεν βρέθηκε`);
    }
    
    // Query στη βάση
    const data = await Model.findAll({ raw: true });
    
    // Αποθήκευση στο cache
    cache.set(tableName, data);
    
    // Ορισμός timeout για καθαρισμό
    const timeout = setTimeout(() => {
        clearCache(tableName);
    }, CACHE_DURATION);
    
    timeouts.set(tableName, timeout);
    
    return data;
}

/**
 * Proxy object για dynamic access στα table data με caching
 * Χρήση: TableData.Lease, TableData.Party, κλπ
 */
const TableData = new Proxy({}, {
    get(target, tableName) {
        if (typeof tableName === 'string') {
            return getTableData(tableName);
        }
        return undefined;
    }
});

// test
// console.log('Testing TableData proxy: fetching User data...');
// TableData.User.then(data => {
//     console.log(`Fetched ${data.length} User records.`);
//     console.log(data);
// }).catch(err => {
//     console.error('Error fetching User data:', err);
// });

export default TableData;
