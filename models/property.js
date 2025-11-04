import { DataTypes } from 'sequelize';
import { db } from "../config/database.js"; 

const Property = db.define('property', 
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        // Βασικά στοιχεία ακινήτου
        kaek: {
            type: DataTypes.STRING,
            comment: 'ΚΑΕΚ - Κωδικός Αναγνώρισης Ειδικής Κατασκευής'
        },
        atak: {
            type: DataTypes.STRING,
            comment: 'ΑΤΑΚ - Αριθμός Ταυτότητας Ακινήτου Κτηματολογίου'
        },
        address: {
            type: DataTypes.STRING,
            comment: 'Διεύθυνση ακινήτου'
        },
        department: {
            type: DataTypes.STRING,
            comment: 'Δημοτικό διαμέρισμα'
        },
        appartment_number: {
            type: DataTypes.STRING,
            comment: 'Αριθμός διαμερίσματος εντός κτιρίου'
        },
        is_part_of_other: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Το ακίνητο είναι τμήμα άλλου ακινήτου (π.χ. διαμέρισμα, κατάστημα) που ανήκει στο Δήμο'
        },
        usage: {
            type: DataTypes.STRING,
            comment: 'Χρήση ακινήτου'
        },
        description: {
            type: DataTypes.TEXT,
            comment: 'Περιγραφή ακινήτου'
        },
        area: {
            type: DataTypes.DECIMAL(8, 2),
            comment: 'Επιφάνεια διαμερίσματος (τ.μ.)'
        },
        area_land: {
            type: DataTypes.DECIMAL(8, 2),
            comment: 'Επιφάνεια οικοπέδου (τ.μ.)'
        },
        area_building: {
            type: DataTypes.STRING,
            comment: 'Επιφάνεια κτίσματος (τ.μ.)'
        },
        construction_year: {
            type: DataTypes.SMALLINT,
            comment: 'Έτος κατασκευής'
        },
        permit: {
            type: DataTypes.STRING,
            comment: 'Αριθμός οικοδομικής άδειας'
        },
        file_server_link: {
            type: DataTypes.TEXT,
            comment: 'Link προς file server'
        },
        
        // Ιδιοκτησιακό καθεστώς
        ownership_status: {
            type: DataTypes.STRING,
            comment: 'Ιδιοκτησιακό καθεστώς - sole_ownership (ιδιόκτητο), shared_ownership (συνιδιοκτησία), individual (Ιδιώτης), unknown (Άγνωστο)'
        },
        ownership_details: {
            type: DataTypes.TEXT,
            comment: 'Λεπτομέρειες ιδιοκτησίας'
        },
        // Καθεστώς μίσθωσης (owned, leased_out, rented)
        asset_type: {
            type: DataTypes.STRING,
            defaultValue: 'owned',
            comment: 'Είδος μίσθωσης ακινήτου - Επιτρεπόμενες τιμές: owned, leased_out, rented, granted'
        },

        active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        
    },
    {
        tableName: 'properties',
        timestamps: true,
        indexes: [
            { fields: ['asset_type'] },
            { fields: ['ownership_status'] },
            { fields: ['is_part_of_other'] }
        ]
    }
);

export { Property };
