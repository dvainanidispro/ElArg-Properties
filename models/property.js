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
            comment: 'Επιφάνεια ακινήτου (τ.μ.)'
        },
        construction_year: {
            type: DataTypes.INTEGER,
            comment: 'Έτος κατασκευής'
        },
        file_server_link: {
            type: DataTypes.TEXT,
            comment: 'Link προς file server'
        },
        
        // Τύπος ακινήτου (owned, leased_out, rented)
        asset_type: {
            type: DataTypes.STRING,
            defaultValue: 'owned',
            comment: 'Τύπος ιδιοκτησίας ακινήτου - Επιτρεπόμενες τιμές: owned, leased_out, rented'
        },

        active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
        
    },
    {
        tableName: 'properties',
        timestamps: true,
        indexes: [
            {
                fields: ['asset_type']
            }
        ]
    }
);

export { Property };
