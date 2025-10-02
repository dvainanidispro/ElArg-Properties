import { DataTypes } from 'sequelize';
import { db } from "../config/database.js"; 


const Log = db.define('log',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        type: DataTypes.STRING, // e.g., "email", "login", "error", "submission"
        severity: DataTypes.STRING, // e.g., "info", "warning", "error"
        body: DataTypes.JSON,
    },
    {
        tableName: 'logs',
        timestamps: true,
        updatedAt: false,
        createdAt: 'createdAt',
    }

);



export { Log };