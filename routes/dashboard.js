/**
 * Express middleware for showing Dashboard page
 */


const dashboardMiddleware = (req, res) => {
    res.render('dashboard');
}

export { dashboardMiddleware };