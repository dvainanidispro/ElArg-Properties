

const permissions = {
    'edit:users': 'Προβολή και επεξεργασία χρηστών',
    'view:content': 'Προβολή περιεχομένου',
    'edit:content': 'Επεξεργασία περιεχομένου',
    'edit:ownschool': 'Προβολή και επεξεργασία στοιχείων κυλικείου',
};

const roles = {
    admin: {
        name: 'admin',
        user: true,
        description: 'Διαχειριστής συστήματος με πλήρη δικαιώματα',
        permissions: ['edit:users', 'view:content', 'edit:content'],
        color: 'danger'
    },
    user: {
        name: 'user',
        user: true,
        description: 'Χρήστης με δικαιώματα επεξεργασίας περιεχομένου',
        permissions: ['view:content', 'edit:content'],
        color: 'success'
    },
    viewer: {
        name: 'viewer',
        user: true,
        description: 'Χρήστης με δικαιώματα μόνο προβολής',
        permissions: ['view:content'],
        color: 'info'
    },

};

const extenderRoles = {
    principal: {
        name: 'principal',
        user: false,
        description: 'Διευθυντής με δικαιώματα υποβολής στοιχείων κυλικείου',
        permissions: ['edit:ownschool']
    },
}

const allRoles = { ...roles, ...extenderRoles };


/** Middleware to check permissions for routes */
let can = (permission) => {
    return (req, res, next) => {
        const userRole = req.user?.role;
        const userPermissions = allRoles?.[userRole]?.permissions || [];
        if (userPermissions.includes(permission)) {
            return next();
        }
        return res.status(403).json({ message: 'Forbidden' });
    };
};


let userHasPermission = (user, permission) => {
    const userRole = user?.role;
    const userPermissions = allRoles?.[userRole]?.permissions || [];
    return userPermissions.includes(permission);
};



export { roles, allRoles, permissions, can, userHasPermission };