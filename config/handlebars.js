import { create as HandlebarsCreator } from 'express-handlebars';

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
        and: (...args) => args.slice(0, -1).every(Boolean), // Handlebars 'and' helper
        /* Check if array includes a value: {{#if (includes array 'value')}} */
        includes: (array, value) => Array.isArray(array) && array.includes(value),
        /* example: {{check variable.length variable 'empty'}} */
        check: (condition, valueIfTrue, valueIfFalse) => condition ? valueIfTrue : valueIfFalse,
        /* example: {{or a b c}}, it needs c (Handlebars doesn't pass undefined). Use ''. */
        or: (a, b, c) => a ?? b ?? c, 
        /** example: {{nestedLookup obj 'key1' 'key2'}}. Το handlebars έχει ήδη την {{lookup object 'key'}} */
        deepLookup: (obj, key1, key2) => obj?.[key1]?.[key2],
        /* example: <script> let obj = {{{objectify obj}}}; </script> */      
        objectify: (object) => JSON.stringify(object),  
        inflect: (number, singular, plural) => number + ' ' + (number==1 ? singular : plural),
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
    }
};

let handlebarsEngine = HandlebarsCreator(handlebarsConfig).engine;

export default handlebarsEngine;
