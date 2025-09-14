import { DataTypes } from 'sequelize';
import { db } from "../config/database.js"; 

const Canteen = db.define('canteen', 
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            comment: 'Όνομα κυλικείου ή σχολείου'
        },
        area: {
            type: DataTypes.SMALLINT,
            comment: 'Επιφάνεια σε τ.μ.'
        },
        lease_start: {
            type: DataTypes.DATE,
            comment: 'Έναρξη μίσθωσης'
        },
        lease_end: {
            type: DataTypes.DATE,
            comment: 'Λήξη μίσθωσης'
        },
        revision_number: {
            type: DataTypes.STRING,
            comment: 'Αριθμός γνωστοποίησης'
        },
        landlord_offer: {
            type: DataTypes.SMALLINT,
            comment: 'Οικονομική προσφορά εκμισθωτή'
        }, 
        active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    },
    {
        tableName: 'canteens',
        timestamps: true,
        indexes: [
            { 
                fields: ['name'],
            },
            {
                fields: ['active'],
            },
            {
                fields: ['lease_end']
            }
        ]
    }
);

export { Canteen };