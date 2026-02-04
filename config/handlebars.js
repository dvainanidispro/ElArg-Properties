import { create as HandlebarsCreator } from 'express-handlebars';
import Handlebars from 'handlebars';
import { userHasPermission } from '../controllers/roles.js';
import { descriptions } from '../controllers/utils.js';

const handlebarsConfig = {
    extname: '.hbs',    // extension for layouts (not views)
    layoutsDir: 'views/layouts',
    defaultLayout: 'main',
    helpers: 'views',
    partialsDir: 'views/partials',
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true
    },
    helpers: {
        /* example: {{#if (eq user.attend 'live')}} Δια ζώσης {{else if (eq user.attend 'internet')}} Διαδικτυακά {{/if}} */  
        eq: (a, b) => a == b, 
        neq: (a, b) => a != b,
        and: (...args) => args.slice(0, -1).every(Boolean), // Handlebars 'and' helper
        /* Check if array includes a value: {{#if (includes array 'value')}} */
        includes: (array, value) => Array.isArray(array) && array.includes(value),
        /* example: {{check variable.length variable 'empty'}} */
        check: (condition, valueIfTrue, valueIfFalse) => condition ? valueIfTrue : valueIfFalse,
        /* example: {{or a b c}}, it needs c (Handlebars doesn't pass undefined). Use '' as third argument. */
        or: (a, b, c) => a ?? b ?? c, 
        /** example: {{deepLookup obj 'key1' 'key2' 'key3'}} or {{deepLookup submission.data @index 'students'}}. Το handlebars έχει ήδη την {{lookup object 'key'}} */
        deepLookup: (obj, ...keys) => {
            // Remove the Handlebars context object (last argument)
            const actualKeys = keys.slice(0, -1);
            return actualKeys.reduce((current, key) => current?.[key], obj) ?? '';
        },
        /* example: <script> let obj = {{{objectify obj}}}; </script> */      
        objectify: (object) => JSON.stringify(object),  
        inflect: (number, singular, plural) => number + ' ' + (number==1 ? singular : plural),
        /* example: {{#each (array 1 2 3)}} */
        array: (...items) => items.slice(0, -1), // -1: Remove the Handlebars context object
        /* example {{join 'a' 'b' 'c'}} => a, b, c */
        join: (...items) => items.slice(0, -1).filter(Boolean).join(', '),
        uniqueJoin: (array, separator=', ') => {
            const uniqueItems = [...new Set(array.filter(Boolean))];
            const escapedItems = uniqueItems.map(item => Handlebars.escapeExpression(item));
            return new Handlebars.SafeString(escapedItems.join(separator));     // για αποφυγή τριπλών αγκυλών
        },
        euro: (price) => new Intl.NumberFormat('el-GR', {style: 'currency', currency: 'EUR'}).format(price),
        time: (date) => {
            if (!date) return '';
            try {
                const dateObj = date instanceof Date ? date : new Date(date);
                if (isNaN(dateObj.getTime())) return '';
                return new Intl.DateTimeFormat('el-GR', { 
                    hour: 'numeric', 
                    minute: '2-digit', 
                    hourCycle: 'h23', 
                    timeZone: 'Europe/Athens' 
                }).format(dateObj);
            } catch (error) {
                console.error('Time formatting error:', error, 'for date:', date);
                return '';
            }
        },
        date: (date) => {
            if (!date) return '';
            try {
                const dateObj = date instanceof Date ? date : new Date(date);
                if (isNaN(dateObj.getTime())) return '';
                return new Intl.DateTimeFormat('el-GR', { 
                    day: 'numeric', 
                    month: 'numeric', 
                    year: 'numeric',
                    timeZone: 'Europe/Athens' 
                }).format(dateObj);
            } catch (error) {
                console.error('Date formatting error:', error, 'for date:', date);
                return '';
            }
        },
        datetime: (date) => {
            if (!date) return '';
            try {
                const dateObj = date instanceof Date ? date : new Date(date);
                if (isNaN(dateObj.getTime())) return '';
                return new Intl.DateTimeFormat('el-GR', { 
                    day: 'numeric', 
                    month: 'numeric', 
                    year: 'numeric', 
                    hour: 'numeric', 
                    minute: '2-digit', 
                    hourCycle: 'h23',
                    timeZone: 'Europe/Athens' 
                }).format(dateObj);
            } catch (error) {
                console.error('DateTime formatting error:', error, 'for date:', date);
                return '';
            }
        },
        dateInput: (date) => {
            if (!date) return '';
            try {
                const dateObj = date instanceof Date ? date : new Date(date);
                if (isNaN(dateObj.getTime())) return '';
                // Μετατροπή σε YYYY-MM-DD format για HTML date input
                return dateObj.toISOString().split('T')[0];
            } catch (error) {
                console.error('DateInput formatting error:', error, 'for date:', date);
                return '';
            }
        },
        /* example: {{#if (can 'edit:users')}} */
        can: function(permission) {
            // Το 'this' είναι το context (το αντικείμενο δεδομένων) που περνιέται στο handlebars
            const user = this.user;
            return userHasPermission(user, permission);
        },
        /* example: {{#unless (can2 'edit:content' ../user)}}d-none{{/unless}} χρήσιμο μέσα σε {{#each}} όπου δεν λειουργεί το can */
        can2: function(permission, user) {
            return userHasPermission(user, permission);
        },
        leaseDirectionText: descriptions.leaseDirection,
        leaseDirectionShortText: descriptions.leaseDirectionShort,
        rentFrequencyText: descriptions.rentFrequency,
        periodStatusText: descriptions.periodStatus,
        periodStatusBadge: descriptions.periodStatusBadge,
        greekMonthText: descriptions.greekMonths,
        ownershipStatusText: descriptions.ownershipStatus,
        assetTypeText: descriptions.assetType,
    }
};

let handlebarsEngine = HandlebarsCreator(handlebarsConfig).engine;

export default handlebarsEngine;
