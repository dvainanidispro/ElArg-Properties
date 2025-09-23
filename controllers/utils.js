

let presentTime = () => {
    let date = new Date();
    return date.toLocaleString('el-GR',{hour12: false});
};


let conversions = {
    leaseDirection: (direction) => {
        const directions = {
            incoming: 'Μίσθωση',
            outgoing: 'Εκμίσθωση'
        };
        return directions[direction] || direction;
    }

};

export { presentTime, conversions };