

let permissions = {
    'edit:users': 'Προβολή και επεξεργασία χρηστών',
    'view:content': 'Προβολή περιεχομένου',
    'edit:content': 'Επεξεργασία περιεχομένου',
    'edit:school': 'Προβολή και επεξεργασία στοιχείων κυλικείου',
};

let roles = {
    admin: {
        name: 'admin',
        description: 'Διαχειριστής συστήματος με πλήρη δικαιώματα',
        permissions: ['edit:users', 'view:content', 'edit:content'],
        color: 'danger'
    },
    user: {
        name: 'user',
        description: 'Χρήστης με δικαιώματα επεξεργασίας περιεχομένου',
        permissions: ['view:content', 'edit:content'],
        color: 'success'
    },
    viewer: {
        name: 'viewer',
        description: 'Χρήστης με δικαιώματα μόνο προβολής',
        permissions: ['view:content'],
        color: 'secondary'
    },
    // principal: {
    //     name: 'principal',
    //     description: 'Διευθυντής με δικαιώματα κυλικείου',
    //     permissions: ['edit:school']
    // },
};

/** Middleware to check permissions for routes */
let can = (permission) => {
    return (req, res, next) => {
        const userRole = req.user?.role;
        const userPermissions = roles?.[userRole]?.permissions || [];
        if (userPermissions.includes(permission)) {
            return next();
        }
        return res.status(403).json({ message: 'Forbidden' });
    };
};


export { can, roles, permissions };