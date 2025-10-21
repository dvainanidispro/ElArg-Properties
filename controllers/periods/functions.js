/*

ΠΑΡΑΔΕΙΓΜΑΤΑ ΑΝΤΙΚΕΙΜΕΝΩΝ PERIOD (ΓΙΑ CANTEEN)
{
    code: 'C-2425-D2',
    property_type: 'canteen',
    start_date: '2024-12-01',
    end_date: '2025-02-28',
    submission_deadline: '2025-03-10',
    name: "2024-2025 - 2η Δόση",
    active: true
  },
  {
    code: 'C-2425-D3',
    property_type: 'canteen',
    start_date: '2025-03-01',
    end_date: '2025-05-31',
    submission_deadline: '2025-06-10',
    name: "2024-2025 - 3η Δόση",
    active: true
  },
  {
    code: 'C-2425-D4',
    property_type: 'canteen',
    start_date: '2025-06-01',
    end_date: '2025-08-31',
    submission_deadline: '2025-09-10',
    name: "2024-2025 - 4η Δόση",
    active: false
  },
  {
    code: 'C-2526-D1',
    property_type: 'canteen',
    start_date: '2025-09-01',
    end_date: '2025-11-30',
    submission_deadline: '2025-12-31',
    name: "2025-2026 - 1η Δόση",
    active: true
  }



D1: Σεπτέμβριος - Οκτώβριος - Νοέμβριος, 1η Δόση
D2: Νοέμβριος προηγούμενου έτους - Ιανουάριος - Φεβρουάριος, 2η Δόση
D3: Μάρτιος - Απρίλιος - Μάιος, 3η Δόση
D4: Ιούνιος - Ιούλιος - Αύγουστος, 4η Δόση (ανενεργό για τα σχολεία)



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
 * Επιστρέφει ένα αντικείμενο period για το συγκεκριμένο έτος και δόση
 * @param {number} year, για παράδειγμα 2025
 * @param {string} installment, τιμές: 'D1', 'D2', 'D3', 'D4'
 * @return {Object} period object για εισαγωγή στη βάση
 */
function createPeriodByInstallment(year, installment) {
    let start_date, end_date, submission_deadline, active, name;
    const deadlineDelay = 10;
    const schoolYear = installment === 'D1' ? year : year - 1;
    const schoolYearLabel = `${schoolYear}-${schoolYear + 1}`;
    
    switch (installment) {
        case 'D2':
            start_date = firstDayOf(year - 1, 11);
            end_date = lastDayOf(year, 2);
            submission_deadline = addDays(end_date, deadlineDelay);
            active = true;
            name = `${schoolYearLabel} - 2η Δόση`;
            break;
        case 'D3':
            start_date = firstDayOf(year, 3);
            end_date = lastDayOf(year, 5);
            submission_deadline = addDays(end_date, deadlineDelay);
            active = true;
            name = `${schoolYearLabel} - 3η Δόση`;
            break;
        case 'D4':
            start_date = firstDayOf(year, 6);
            end_date = lastDayOf(year, 8);
            submission_deadline = addDays(end_date, deadlineDelay);
            active = false; // To D4 είναι πάντα ανενεργό για τα σχολεία
            name = `${schoolYearLabel} - 4η Δόση`;
            break;
        case 'D1':
            start_date = firstDayOf(year, 9);
            end_date = lastDayOf(year, 11);
            submission_deadline = addDays(end_date, deadlineDelay);
            active = true;
            name = `${schoolYearLabel} - 1η Δόση`;
            break;
    }
    
    // Προσδιορισμός αριθμού δόσης για το code
    const installmentNumber = installment.substring(1);
    // Χρήση των 2 τελευταίων ψηφίων κάθε έτους για συντομία
    const schoolYearShort = `${schoolYear.toString().slice(-2)}${(schoolYear + 1).toString().slice(-2)}`;
    
    return {
        code: `C-${schoolYearShort}-D${installmentNumber}`,
        property_type: 'canteen',
        start_date: formatDateForDB(start_date),
        end_date: formatDateForDB(end_date),
        submission_deadline: formatDateForDB(submission_deadline),
        name: name,
        active: active,
    };
}


// tests
// console.log(createPeriodByInstallment(2025, 'D4'));
// console.log(createPeriodByInstallment(2025, 'D1'));
// console.log(createPeriodByInstallment(2026, 'D2'));
// console.log(createPeriodByInstallment(2026, 'D3'));


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
        return createPeriodByInstallment(year, 'D2');
    } else if (month === 5) {
        return createPeriodByInstallment(year, 'D3');
    // } else if (month === 8) {
    //     return createPeriodByInstallment(year, 'D4');
    } else if (month === 11) {
        return createPeriodByInstallment(year, 'D1');
    }
    return null;
}





// tests
// console.log(createPeriodEndingInMonthOf('2025-02-15'));     // C-2425-D2
// console.log(createPeriodEndingInMonthOf('2025-03-12'));     // null
// console.log(createPeriodEndingInMonthOf('2025-05-01'));     // C-2425-D3
// console.log(createPeriodEndingInMonthOf('2025-08-20'));     // null
// console.log(createPeriodEndingInMonthOf('2025-09-15'));     // null ή C-2526-D1 
// console.log(createPeriodEndingInMonthOf('2025-10-18'));     // null
// console.log(createPeriodEndingInMonthOf('2025-11-23'));     // C-2425-D4
// console.log(createPeriodEndingInMonthOf('2025-12-21'));     // null
// console.log(createPeriodEndingInMonthOf(new Date()));       // ???


export { createPeriodEndingInMonthOf, formatDateForDB };