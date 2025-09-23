

let presentTime = () => {
    let date = new Date();
    return date.toLocaleString('el-GR',{hour12: false});
};


let descriptions = {
    leaseDirection: (direction) => {
        const directions = {
            incoming: 'Μίσθωση',
            outgoing: 'Εκμίσθωση'
        };
        return directions[direction] || direction;
    }

};

export { presentTime, descriptions };