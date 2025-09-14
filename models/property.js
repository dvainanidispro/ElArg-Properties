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
        address: {
            type: DataTypes.TEXT,
            comment: 'Διεύθυνση ακινήτου'
        },
        description: {
            type: DataTypes.TEXT,
            comment: 'Περιγραφή ακινήτου'
        },
        area: {
            type: DataTypes.SMALLINT,
            comment: 'Εμβαδό ακινήτου (τ.μ.)'
        },
        construction_year: {
            type: DataTypes.INTEGER,
            comment: 'Έτος κατασκευής'
        },
        file_server_link: {
            type: DataTypes.TEXT,
            comment: 'Link προς file server'
        },
        
        // Τύπος ακινήτου
        property_type: {
            type: DataTypes.STRING,
            defaultValue: 'owned',
            comment: 'Τύπος ακινήτου - Επιτρεπόμενες τιμές: owned (ιδιόκτητο), leased_out (εκμισθωμένο από δήμο), rented (μισθωμένο από δήμο)'
        },
        
        // Στοιχεία μίσθωσης/εκμίσθωσης (όταν υπάρχουν)
        // party_id: {
        //     type: DataTypes.INTEGER,
        //     allowNull: true,
        //     comment: 'ID του μισθωτή/εκμισθωτή από τον πίνακα parties'
        // },
        lease_start: {
            type: DataTypes.DATEONLY,
            comment: 'Ημερομηνία έναρξης μίσθωσης/εκμίσθωσης'
        },
        lease_end: {
            type: DataTypes.DATEONLY,
            comment: 'Ημερομηνία λήξης μίσθωσης/εκμίσθωσης'
        },
        monthly_rent: {
            type: DataTypes.DECIMAL(10, 2),
            comment: 'Μηνιαίο τίμημα (ή τριμηνιαίο ανάλογα την μίσθωση)'
        },
        rent_frequency: {
            type: DataTypes.STRING,
            defaultValue: 'monthly',
            comment: 'Συχνότητα πληρωμής μισθώματος - Επιτρεπόμενες τιμές: monthly (μηνιαία), quarterly (τριμηνιαία)'
        },
        rent_adjustment_info: {
            type: DataTypes.TEXT,
            comment: 'Πληροφορίες αναπροσαρμογής μισθώματος'
        },
        
        // Επιπλέον στοιχεία για μισθωμένα από δήμο
        guarantee_letter: {
            type: DataTypes.STRING,
            comment: 'Εγγυητική Επιστολή (για μισθωμένα από δήμο)'
        },
        
    },
    {
        tableName: 'properties',
        timestamps: true,
        // indexes: [
        //     {
        //         fields: ['kaek']
        //     },
        //     {
        //         fields: ['property_type']
        //     },
        //     {
        //         fields: ['party_id']
        //     },
        //     {
        //         fields: ['lease_end']
        //     }
        // ]
    }
);

export { Property };
