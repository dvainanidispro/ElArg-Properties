import { DataTypes } from 'sequelize';
import { db } from "../config/database.js"; 

const Tenant = db.define('tenant', 
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: DataTypes.STRING,
        afm: DataTypes.STRING,
        email: {
            type: DataTypes.STRING,
            unique: true
        },
        contact: DataTypes.STRING,
        contracts: DataTypes.JSON,
        role: {
            type: DataTypes.STRING,
            defaultValue: 'tenant'
        },
    },
    {
        tableName: 'tenants',
        timestamps: true
    }
);

export { Tenant };