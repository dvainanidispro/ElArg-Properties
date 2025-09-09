import { DataTypes } from 'sequelize';
import { db } from "../config/database.js"; 

const Canteen = db.define('canteen', 
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: DataTypes.STRING,
        area: DataTypes.SMALLINT,
        lease_start: DataTypes.DATE,
        lease_end: DataTypes.DATE,
        revision_number: DataTypes.STRING,
        landlord_offer: DataTypes.SMALLINT,
    },
    {
        tableName: 'canteens',
        timestamps: true
    }
);

export { Canteen };