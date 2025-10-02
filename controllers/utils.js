

let presentTime = () => {
    let date = new Date();
    return date.toLocaleString('el-GR',{hour12: false});
};

let greekdate = (inputDate) => {
    const date = new Date(inputDate);
    return date.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};


let descriptions = {
    leaseDirection: (direction) => {
        const directions = {
            incoming: 'Μίσθωση',
            outgoing: 'Εκμίσθωση'
        };
        return directions[direction] || direction;
    },
    rentFrequency: (frequency) => {
        const frequencies = {
            monthly: 'Μηνιαία',
            quarterly: 'Τριμηνιαία',
            yearly: 'Ετήσια'
        };
        return frequencies[frequency] || frequency;
    },
    periodStatus: (status) => {
        const statuses = {
            planned: 'Προγραμματισμένη',
            open: 'Ανοιχτή',
            closed: 'Κλειστή',
            inactive: 'Ανενεργή'
        };
        return statuses[status] || status;
    },
};

export { presentTime, greekdate, descriptions };