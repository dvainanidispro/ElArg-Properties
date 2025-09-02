import { create as HandlebarsCreator } from 'express-handlebars';

const handlebarsConfig = {
    extname: '.hbs',    // extension for layouts (not views)
    layoutsDir: 'views',
    defaultLayout: 'main',
    helpers: 'views',
    partialsDir: 'views/partials',
    helpers: {
        /* example: {{#if (eq user.attend 'live')}} Δια ζώσης {{else if (eq user.attend 'internet')}} Διαδικτυακά {{/if}} */  
        eq: (a, b) => a == b, // alias for eq, used in views
        and: (...args) => args.slice(0, -1).every(Boolean), // Handlebars 'and' helper
        /* example: {{check variable.length variable 'empty'}} */
        check: (condition, valueIfTrue, valueIfFalse) => condition ? valueIfTrue : valueIfFalse,
        /* example: {{or a b c}}, it needs c (Handlebars doesn't pass undefined). Use ''. */
        or: (a, b, c) => a ?? b ?? c, 
        /* example: <script> let obj = {{{objectify obj}}}; </script> */      
        objectify: (object) => JSON.stringify(object),  
        inflect: (number, singular, plural) => number + ' ' + (number==1 ? singular : plural),
        euro: (price) => new Intl.NumberFormat('el-GR', {style: 'currency', currency: 'EUR'}).format(price),
        time: (date) => new Intl.DateTimeFormat('el-GR', { hour: 'numeric', minute: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Athens' }).format(new Date(date)),
        date: (date) => new Intl.DateTimeFormat('el-GR', { day: 'numeric', month: 'numeric', year: 'numeric' , timeZone: 'Europe/Athens' }).format(new Date(date)),
        datetime: (date) => new Intl.DateTimeFormat('el-GR', { day: 'numeric', month: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hourCycle: 'h23' , timeZone: 'Europe/Athens' }).format(new Date(date)),
        lookupField: (response, name) => {
            if (!Array.isArray(response)) return null;
            return response.find(f => f.name === name) || {};
        },
    }
};

let handlebarsEngine = HandlebarsCreator(handlebarsConfig).engine;

export default handlebarsEngine;
