import express from 'express';
import crypto from 'crypto';
import Models from '../models/models.js';
import { can, roles, permissions } from '../controllers/roles.js';
import { Op } from 'sequelize';
import log from '../controllers/logger.js';

const admin = express.Router();

/**
 * Κρυπτογραφεί ένα password με SHA-256 hashing
 * @param {string} password - Το password προς κρυπτογράφηση
 * @returns {string} Το hashed password
 */
const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};


////////////////////   ROUTES ΓΙΑ ΔΙΑΧΕΙΡΙΣΗ ΧΡΗΣΤΩΝ   ////////////////////

// Middleware για έλεγχο admin δικαιωμάτων
admin.use(can('edit:users'));



/**
 * GET /admin/users - Εμφάνιση λίστας όλων των χρηστών
 */
admin.get('/users', async (req, res) => {
    try {
        const users = await Models.User.findAll({
            attributes: ['id', 'email', 'name', 'role', 'createdAt'],
            order: [['createdAt', 'DESC']],
            raw: true
        });
        
        res.render('admin/users', { 
            users,
            roles: roles,
            user: req.user,
            title: 'Διαχείριση Χρηστών'
        });
    } catch (error) {
        log.error('Σφάλμα κατά την ανάκτηση χρηστών:', error);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση χρηστών' });
    }
});

/**
 * GET /admin/users/:id - Εμφάνιση στοιχείων συγκεκριμένου χρήστη
 */
admin.get('/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const user = await Models.User.findByPk(userId, {
            attributes: ['id', 'email', 'name', 'role', 'createdAt', 'updatedAt'],
            raw: true       // JavaScript object χωρίς μεθόδους Sequelize
        });
        
        if (!user) {
            return res.status(404).render('errors/404', { message: 'Ο χρήστης δεν βρέθηκε' });
        }
        
        res.render('admin/edit-user', { 
            userDetails: user,
            roles: roles,
            user: req.user,
            title: `Επεξεργασία Χρήστη: ${user.name || user.email}`
        });
    } catch (error) {
        log.error('Σφάλμα κατά την ανάκτηση χρήστη:', error);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση χρήστη' });
    }
});

/**
 * POST /admin/users - Δημιουργία νέου χρήστη
 */
admin.post('/users', async (req, res) => {
    try {
        const { email, name, password, role } = req.body;
        
        // Βασικός έλεγχος δεδομένων
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Τα πεδία email και password είναι υποχρεωτικά' 
            });
        }
        
        // Έλεγχος αν υπάρχει ήδη χρήστης με το ίδιο email
        const existingUser = await Models.User.findOne({
            where: { email }
        });
        
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Υπάρχει ήδη χρήστης με αυτό το email' 
            });
        }
        
        const newUser = await Models.User.create({
            email,
            name: name || email.split('@')[0],
            password: hashPassword(password),
            role: role || 'user'
        });
        
        log.info(`Νέος χρήστης δημιουργήθηκε: ${newUser.email} (ID: ${newUser.id})`);
        
        res.status(201).json({ 
            success: true, 
            message: 'Ο χρήστης δημιουργήθηκε επιτυχώς',
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                role: newUser.role
            }
        });
    } catch (error) {
        log.error('Σφάλμα κατά τη δημιουργία χρήστη:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά τη δημιουργία χρήστη' 
        });
    }
});

/**
 * PUT /admin/users/:id - Ενημέρωση στοιχείων χρήστη
 */
admin.put('/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { email, name, role, password } = req.body;
        
        const user = await Models.User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Ο χρήστης δεν βρέθηκε' 
            });
        }
        
        // Έλεγχος αν το νέο email υπάρχει ήδη σε άλλον χρήστη
        if (email !== user.email) {
            const existingUser = await Models.User.findOne({
                where: {
                    id: { [Op.ne]: userId },
                    email
                }
            });
            
            if (existingUser) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Υπάρχει ήδη άλλος χρήστης με αυτό το email' 
                });
            }
        }
        
        // Δημιουργία αντικειμένου ενημέρωσης
        const updateData = {
            email: email || user.email,
            name: name || user.name,
            role: role || user.role
        };
        
        // Προσθήκη κωδικού μόνο αν έχει δοθεί νέος
        if (password && password.trim() !== '') {
            updateData.password = hashPassword(password);
        }
        
        await user.update(updateData);
        
        log.info(`Ο Χρήστης ${user.email} ενημερώθηκε (ID: ${user.id})`);
        
        res.json({ 
            success: true, 
            message: 'Ο χρήστης ενημερώθηκε επιτυχώς',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        log.error('Σφάλμα κατά την ενημέρωση χρήστη:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά την ενημέρωση χρήστη' 
        });
    }
});

/**
 * DELETE /admin/users/:id - Διαγραφή χρήστη
 */
admin.delete('/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        // Αποτροπή διαγραφής του ίδιου του admin
        if (userId === req.user.id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Δεν μπορείτε να διαγράψετε τον δικό σας λογαριασμό' 
            });
        }
        
        const user = await Models.User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Ο χρήστης δεν βρέθηκε' 
            });
        }
        
        await user.destroy();
        
        log.info(`Χρήστης διαγράφηκε: ${user.email} (ID: ${user.id})`);
        
        res.json({ 
            success: true, 
            message: 'Ο χρήστης διαγράφηκε επιτυχώς' 
        });
    } catch (error) {
        log.error('Σφάλμα κατά τη διαγραφή χρήστη:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά τη διαγραφή χρήστη' 
        });
    }
});


admin.get('/roles', (req, res) => {
    res.render('admin/roles', { 
        roles: roles,
        permissions: permissions,
        user: req.user,
        title: 'Διαχείριση Ρόλων'
    });
});

export default admin;