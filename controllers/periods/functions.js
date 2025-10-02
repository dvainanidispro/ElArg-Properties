/*

ΠΑΡΑΔΕΙΓΜΑΤΑ ΑΝΤΙΚΕΙΜΕΝΩΝ PERIOD (ΓΙΑ CANTEEN)
{
    code: 'C-2025-Q1',
    property_type: 'canteen',
    start_date: '2024-12-01',
    end_date: '2025-02-28',
    submission_deadline: '2025-03-10',
    active: true
  },
  {
    code: 'C-2025-Q2',
    property_type: 'canteen',
    start_date: '2025-03-01',
    end_date: '2025-05-31',
    submission_deadline: '2025-06-10',
    active: true
  },
  {
    code: 'C-2025-Q3',
    property_type: 'canteen',
    start_date: '2025-06-01',
    end_date: '2025-08-31',
    submission_deadline: '2025-09-10',
    active: false
  },
  {
    code: 'C-2025-Q4',
    property_type: 'canteen',
    start_date: '2025-09-01',
    end_date: '2025-11-30',
    submission_deadline: '2025-12-31',
    active: true
  }



Q1: Νοέμβριος προηγούμενου έτους - Ιανουάριος - Φεβρουάριος
Q2: Μάρτιος - Απρίλιος - Μάιος
Q3: Ιούνιος - Ιούλιος - Αύγουστος
Q4: Σεπτέμβριος - Οκτώβριος - Νοέμβριος



*/



function firstDayOf(year, monthNumber) {
    return new Date(year, monthNumber - 1, 1);
}
function lastDayOf(year, monthNumber) {
    return new Date(year, monthNumber, 0);
}
/** Επιστρέφει νέα ημερομηνία, days ημέρες μετά την date */
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function formatDateForDB(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return [year, month, day].join('-');
}

/**
 * Επιστρέφει ένα αντικείμενο period για το συγκεκριμένο έτος και τρίμηνο
 * @param {number} year, για παράδειγμα 2025
 * @param {string} quarter, τιμές: 'Q1', 'Q2', 'Q3', 'Q4'
 * @return {Object} period object για εισαγωγή στη βάση
 */
function createPeriodByQuarter(year, quarter) {
    let start_date, end_date, submission_deadline, active;
    const deadlineDelay = 10;
    switch (quarter) {
        case 'Q1':
            start_date = firstDayOf(year - 1, 11);
            end_date = lastDayOf(year, 2);
            submission_deadline = addDays(end_date, deadlineDelay);
            active = true;
            break;
        case 'Q2':
            start_date = firstDayOf(year, 3);
            end_date = lastDayOf(year, 5);
            submission_deadline = addDays(end_date, deadlineDelay);
            active = true;
            break;
        case 'Q3':
            start_date = firstDayOf(year, 6);
            end_date = lastDayOf(year, 8);
            submission_deadline = addDays(end_date, deadlineDelay);
            active = false; // To Q3 είναι πάντα ανενεργό για τα σχολεία
            break;
        case 'Q4':
            start_date = firstDayOf(year, 9);
            end_date = lastDayOf(year, 11);
            submission_deadline = addDays(end_date, deadlineDelay);
            active = true;
            break;
    }
    return {
        code: `C-${year}-${quarter}`,
        property_type: 'canteen',
        start_date: formatDateForDB(start_date),
        end_date: formatDateForDB(end_date),
        submission_deadline: formatDateForDB(submission_deadline),
        active: active,
    };
}


// tests
// console.log(createPeriodByQuarter(2025, 'Q3'));
// console.log(createPeriodByQuarter(2025, 'Q4'));
// console.log(createPeriodByQuarter(2026, 'Q1'));
// console.log(createPeriodByQuarter(2026, 'Q2'));


/**
 * Επιστρέφει την περίοδο που λήγει (end_date) τον μήνα της δοσμένης ημερομηνίας ή null
 * @param {string|Date} date - Η ημερομηνία για την οποία ψάχνουμε την περίοδο που λήγει
 * @returns {Object|null} Το αντικείμενο period (για εισαγωγή στη βάση) ή null αν δεν υπάρχει περίοδος που λήγει αυτόν τον μήνα
 */
function createPeriodEndingInMonthOf(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1; // οι μήνες είναι 0-11
    if (month === 2) {
        return createPeriodByQuarter(year, 'Q1');
    } else if (month === 5) {
        return createPeriodByQuarter(year, 'Q2');
    // } else if (month === 8) {
    //     return createPeriodByQuarter(year, 'Q3');
    } else if (month === 11) {
        return createPeriodByQuarter(year, 'Q4');
    }
    return null;
}





// tests
// console.log(createPeriodEndingInMonthOf('2025-02-15'));
// console.log(createPeriodEndingInMonthOf('2025-03-12'));
// console.log(createPeriodEndingInMonthOf('2025-05-01'));
// console.log(createPeriodEndingInMonthOf('2025-08-20'));
// console.log(createPeriodEndingInMonthOf('2025-09-15'));
// console.log(createPeriodEndingInMonthOf('2025-10-18'));
// console.log(createPeriodEndingInMonthOf('2025-11-23'));
// console.log(createPeriodEndingInMonthOf('2025-12-21'));
// console.log(createPeriodEndingInMonthOf(new Date()));


export { createPeriodByQuarter, createPeriodEndingInMonthOf, formatDateForDB };