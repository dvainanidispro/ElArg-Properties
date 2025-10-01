/**
 * Αποστολή Reminders στους Διευθυντές Σχολείων 
 * οι οποίοι δεν έχουν υποβάλει ακόμα στοιχεία για την ενεργή περίοδο.
 */

import Models from '../../models/models.js';
import log from '../logger.js';
import { getActiveCanteenPeriod } from './periods.js';