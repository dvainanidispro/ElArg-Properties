/**
 * cache module - Caching system για Sequelize model data
 * 
 * Exports:
 * - TableData: Επιστρέφει array με τα records του model
 * - TableMap: Επιστρέφει Map<id, record> για γρήγορη αναζήτηση
 * - refreshModel: Απαλείφει το model από το cache για refresh
 * 
 * @example
 * import { TableData, TableMap, refreshModel } from '../models/cache.js';
 * 
 * // Παράδειγμα 1: Λήψη array
 * const allUsersArray = await TableData.User;
 * 
 * // Παράδειγμα 2: Λήψη Map για γρήγορη αναζήτηση
 * const departmentMap = await TableMap.Department;
 * const dept = departmentMap.get(5);
 * 
 * // Παράδειγμα 3: Refresh μετά από αλλαγές
 * refreshModel('Department');
 */

import Models from './models.js';
import ms from 'ms';
import log from '../controllers/logger.js';

/**
 * Cache για τα model data
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
const CACHE_DURATION = ms(process.env.CACHETABLESDURATION || '1h');

/**
 * Καθαρίζει το cache για ένα συγκεκριμένο model
 * @param {string} modelName - Το όνομα του model
 */
function clearCache(modelName) {
    cache.delete(modelName);
    if (timeouts.has(modelName)) {
        clearTimeout(timeouts.get(modelName));
        timeouts.delete(modelName);
    }
}

/**
 * Φέρνει τα data από το model (με caching)
 * @param {string} modelName - Το όνομα του model (π.χ. 'Lease', 'Party')
 * @returns {Promise<Array>}
 */
async function getTableData(modelName) {

    // Έλεγχος αν υπάρχει cached data
    if (cache.has(modelName)) {
        return cache.get(modelName);
    }
    
    // Έλεγχος αν το model υπάρχει
    const Model = Models[modelName];
    if (!Model) {
        throw new Error(`Model ${modelName} δεν βρέθηκε`);
    }
    
    // Query στη βάση
    const data = await Model.findAll({ raw: true });
    
    // Αποθήκευση στο cache
    cache.set(modelName, data);
    
    // Ορισμός timeout για καθαρισμό
    const timeout = setTimeout(() => {
        clearCache(modelName);
    }, CACHE_DURATION);
    
    timeouts.set(modelName, timeout);
    
    return data;
}

/**
 * Φέρνει τα data από το model ως Map (με caching)
 * @param {string} modelName - Το όνομα του model
 * @returns {Promise<Map>}
 */
async function getTableDataAsMap(modelName) {
    const data = await getTableData(modelName);
    return new Map(data.map(item => [item.id, item]));
}

/**
 * Proxy object για dynamic access στα model data με caching
 * @example
 * const allUsers = await TableData.User;
 * const allDepartments = await TableData.Department;
 */
export const TableData = new Proxy({}, {
    get(target, modelName) {
        if (typeof modelName === 'string') {
            return getTableData(modelName);
        }
        return undefined;
    }
});

/**
 * Proxy object για dynamic access στα model data ως Map με caching
 * @example
 * const departmentMap = await TableMap.Department;
 * const dept = departmentMap.get(5);
 */
export const TableMap = new Proxy({}, {
    get(target, modelName) {
        if (typeof modelName === 'string') {
            return getTableDataAsMap(modelName);
        }
        return undefined;
    }
});

/**
 * Απαλείφει το model από το cache για refresh
 * Τα data θα ξαναφορτωθούν από τη βάση στην επόμενη κλήση TableData ή TableMap
 * @param {string} modelName - Το όνομα του model
 * @example
 * // Μετά από create/update/delete
 * await User.create({...});
 * refreshModel('User');
 */
export function refreshModel(modelName) {
    clearCache(modelName);
}

// Preload models από την PRELOADMODELS env μεταβλητή
setTimeout(async () => {
    if (process.env.PRELOADMODELS) {
        try {
            const modelsToPreload = JSON.parse(process.env.PRELOADMODELS);
            const loaded = [];
            
            for (const modelName of modelsToPreload) {
                try {
                    await getTableData(modelName);
                    loaded.push(modelName);
                } catch (error) {
                    log.warn(`Failed to preload model ${modelName}: ${error.message}`);
                }
            }
            
            if (loaded.length) {
                log.info(`Preloaded models from database: ${loaded.join(', ')}`);
            }
        } catch (error) {
            log.error(`Failed to parse PRELOADMODELS: ${error.message}`);
        }
    }
}, 10000);