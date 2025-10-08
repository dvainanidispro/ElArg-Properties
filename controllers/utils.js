

let presentTime = () => {
    let date = new Date();
    return date.toLocaleString('el-GR',{hour12: false});
};

let greekdate = (inputDate) => {
    const date = new Date(inputDate);
    return date.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};


let descriptions = {
    ownershipStatus: (status) => {
        const statuses = {
            not_owned: 'Δεν ανήκει στο Δήμο',
            sole_ownership: 'Ιδιόκτητο',
            shared_ownership: 'Συνιδιόκτητο',
        };
        return statuses[status] || status;
    },
    assetType: (type) => {
        const types = {
            owned: 'Ιδιόκτητο',
            leased_out: 'Εκμισθωμένο',
            rented: 'Μισθωμένο',
            granted: 'Παραχωρημένο',
        };
        return types[type] || type;
    },
    leaseDirection: (direction) => {
        const directions = {
            incoming: 'Μίσθωση - Ο δήμος μισθώνει από τρίτους',
            outgoing: 'Εκμίσθωση - Ο δήμος εκμισθώνει σε τρίτους',
            grant: 'Παραχώρηση - Ο δήμος παραχωρεί σε τρίτους',
        };
        return directions[direction] || direction;
    },
    leaseDirectionShort: (direction) => {
        const directions = {
            incoming: 'Μίσθωση',
            outgoing: 'Εκμισθωση',
            grant: 'Παραχώρηση',
        };
        return directions[direction] || direction;
    },
    rentFrequency: (frequency) => {
        const frequencies = {
            monthly: 'Μηνιαία',
            quarterly: 'Τριμηνιαία',
            semiannually: 'Εξαμηνιαία',
            yearly: 'Ετήσια',
        };
        return frequencies[frequency] || frequency;
    },
    periodStatus: (status) => {
        const statuses = {
            planned: 'Προγραμματισμένη',
            open: 'Ανοιχτή',
            closed: 'Κλειστή',
            inactive: 'Ανενεργή',
        };
        return statuses[status] || status;
    },
    greekMonths: (monthNumber) => {
        const months = {
            1: 'Ιανουάριος',
            2: 'Φεβρουάριος',
            3: 'Μάρτιος',
            4: 'Απρίλιος',
            5: 'Μάιος',
            6: 'Ιούνιος',
            7: 'Ιούλιος',
            8: 'Αύγουστος',
            9: 'Σεπτέμβριος',
            10: 'Οκτώβριος',
            11: 'Νοέμβριος',
            12: 'Δεκέμβριος',
        };
        return months[monthNumber] || monthNumber;
    },
};

export { presentTime, greekdate, descriptions };