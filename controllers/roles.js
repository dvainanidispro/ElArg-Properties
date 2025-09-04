

let permissions = {
    'edit:users': 'Προβολή και επεξεργασία χρηστών',
    'view:content': 'Προβολή περιεχομένου',
    'edit:content': 'Επεξεργασία περιεχομένου',
    'edit:school': 'Προβολή και επεξεργασία στοιχείων κυλικείου',
};

let roles = {
    admin: ['edit:users', 'view:content', 'edit:content'],
    user: ['view:content', 'edit:content'],
    viewer: ['view:content'],
    principal: ['edit:school'],
};

/** Middleware to check permissions for routes */
let can = (permission) => {
    return (req, res, next) => {
        const userRole = req.user?.role;
        const userPermissions = roles?.[userRole] || [];
        if (userPermissions.includes(permission)) {
            return next();
        }
        return res.status(403).json({ message: 'Forbidden' });
    };
};


export { can, roles, permissions };