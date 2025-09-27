import { Router } from 'express';
import Models from '../models/models.js';
import { can } from '../controllers/roles.js';
import log from '../controllers/logger.js';

const dashboard = Router();



// Αρχική σελίδα (dashboard)
dashboard.get(['/', '/dashboard'], 

    // Redirect principals to their canteen page
    (req, res, next) => {
        let userRole = req.user ? req.user.role : 'guest';
        if (userRole === 'principal') {
            res.redirect('/canteens/mycanteen');
            return;
        }
        next();
    },

    // Show dashboard to users
    can('view:content'),
    async (req, res) => {
        res.render('dashboard');
    }


    
);




export default dashboard;