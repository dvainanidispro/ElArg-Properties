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
        /* Switch helper for conditional rendering: {{#switch value}} {{#case 'option1'}}Content1{{/case}} {{#default}}Default{{/default}} {{/switch}} */
        switch: function(value, options) {
            this.switch_value = value;
            return options.fn(this);
        },
        case: function(value, options) {
            if (value == this.switch_value) {
                return options.fn(this);
            }
        },
        default: function(options) {
            return options.fn(this);
        },
        /* Check if array includes a value: {{#if (includes array 'value')}} */
        includes: (array, value) => Array.isArray(array) && array.includes(value),
        /* Lookup nested property: {{lookup obj key 'property'}} or {{lookup obj.key}} */
        lookup: function(obj, key, property) {
            if (arguments.length === 3) {
                // Format: {{lookup obj key 'property'}}
                return obj && obj[key] && obj[key][property] ? obj[key][property] : 'null';
            } else if (arguments.length === 2) {
                // Format: {{lookup obj key}}
                return obj && obj[key] ? obj[key] : 'null';
            }
            return null;
        },
        /* Get object keys: {{#each (objectKeys obj)}} */
        objectKeys: (obj) => Object.keys(obj),
        /* Get role color: {{roleColor roles 'admin'}} */
        roleColor: (rolesObj, roleName) => rolesObj?.[roleName]?.color || 'primary',
        /* example: {{check variable.length variable 'empty'}} */
        check: (condition, valueIfTrue, valueIfFalse) => condition ? valueIfTrue : valueIfFalse,
        /* example: {{or a b c}}, it needs c (Handlebars doesn't pass undefined). Use ''. */
        or: (a, b, c) => a ?? b ?? c, 
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
