

let presentTime = () => {
    let date = new Date();
    return date.toLocaleString('el-GR',{hour12: false});
};

export { presentTime };