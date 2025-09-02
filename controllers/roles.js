

let permissions = {
    'edit:users': 'Προβολή και επεξεργασία χρηστών',
    'view:content': 'Προβολή περιεχομένου',
    'edit:content': 'Επεξεργασία περιεχομένου',
    'edit:school': 'Προβολή και επεξεργασία στοιχείων κυλικείου',
};

let roles = {
    admin: ['edit:users'],
    user: ['view:content', 'edit:content'],
    viewer: ['view:content'],
    director: ['edit:school'],
};

/** Middleware to check permissions for routes */
let can = (requiredPermission) => {
    return (req, res, next) => {
        const userRole = req.user.role;
        const userPermissions = roles[userRole] || [];
        if (userPermissions.includes(requiredPermission)) {
            return next();
        }
        return res.status(403).json({ message: 'Forbidden' });
    };
};